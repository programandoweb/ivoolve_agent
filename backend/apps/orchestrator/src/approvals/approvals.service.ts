import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';

import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { ProvidersService } from '../providers/providers.service';
import {
  ApprovalRecord,
  ApprovalStatus,
} from './approval.types';

interface ApprovalRow extends RowDataPacket {
  id: string;
  tenant_id: string | null;
  agent_id: string;
  action_name: string;
  payload_json: string;
  status: ApprovalStatus;
  requested_by: string | null;
  decided_by: string | null;
  decision_note: string | null;
  created_at: Date;
  decided_at: Date | null;
}

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
    private readonly providers: ProvidersService,
    private readonly audit: AuditService,
  ) {}

  requiresApproval(actionName: string): boolean {
    const configured = this.config.get<string>(
      'APPROVAL_REQUIRED_TOOLS',
      'provider.send_message',
    );

    return configured
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .includes(actionName);
  }

  async request(input: {
    tenantId?: string;
    agentId: string;
    actionName: string;
    payload: Record<string, unknown>;
    requestedBy?: string;
  }): Promise<ApprovalRecord> {
    const record: ApprovalRecord = {
      id: randomUUID(),
      tenantId:
        input.tenantId ??
        this.config.get<string>('DEFAULT_TENANT_ID', 'default'),
      agentId: input.agentId,
      actionName: input.actionName,
      payload: input.payload,
      status: 'pending',
      requestedBy: input.requestedBy,
      createdAt: new Date().toISOString(),
    };

    if (this.database.enabled) {
      await this.database.execute(
        `INSERT INTO approvals
          (id, tenant_id, agent_id, action_name, payload_json, status,
           requested_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          record.id,
          record.tenantId,
          record.agentId,
          record.actionName,
          JSON.stringify(record.payload),
          record.requestedBy ?? null,
          new Date(record.createdAt),
        ],
      );
    } else {
      const all = await this.readLocal();
      all.push(record);
      await this.writeLocal(all);
    }

    await this.audit.record({
      tenantId: record.tenantId,
      actor: record.requestedBy,
      eventName: 'approval.requested',
      entityType: 'approval',
      entityId: record.id,
      metadata: {
        agentId: record.agentId,
        actionName: record.actionName,
      },
    });

    return record;
  }

  async list(
    tenantId: string,
    status?: ApprovalStatus,
  ): Promise<ApprovalRecord[]> {
    if (this.database.enabled) {
      const rows = status
        ? await this.database.query<ApprovalRow[]>(
            `SELECT *
               FROM approvals
              WHERE tenant_id = ? AND status = ?
              ORDER BY created_at DESC
              LIMIT 500`,
            [tenantId, status],
          )
        : await this.database.query<ApprovalRow[]>(
            `SELECT *
               FROM approvals
              WHERE tenant_id = ?
              ORDER BY created_at DESC
              LIMIT 500`,
            [tenantId],
          );

      return rows.map((row) => this.fromRow(row));
    }

    return (await this.readLocal())
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          (!status || item.status === status),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async approve(
    id: string,
    tenantId: string,
    decidedBy: string,
    note?: string,
  ) {
    const record = await this.require(id, tenantId);

    if (record.status !== 'pending') {
      throw new ConflictException(
        `La aprobación "${id}" ya fue procesada.`,
      );
    }

    await this.transition(
      record,
      'processing',
      decidedBy,
      note,
      false,
    );

    try {
      const result = await this.execute(record);

      const approved = await this.transition(
        { ...record, status: 'processing' },
        'approved',
        decidedBy,
        note,
        true,
      );

      await this.audit.record({
        tenantId,
        actor: decidedBy,
        eventName: 'approval.approved',
        entityType: 'approval',
        entityId: id,
        metadata: {
          agentId: record.agentId,
          actionName: record.actionName,
        },
      });

      return { approval: approved, result };
    } catch (error) {
      await this.transition(
        { ...record, status: 'processing' },
        'pending',
        undefined,
        undefined,
        false,
      );

      await this.audit.record({
        tenantId,
        actor: decidedBy,
        eventName: 'approval.execution_failed',
        entityType: 'approval',
        entityId: id,
        metadata: {
          actionName: record.actionName,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  async reject(
    id: string,
    tenantId: string,
    decidedBy: string,
    note?: string,
  ): Promise<ApprovalRecord> {
    const record = await this.require(id, tenantId);

    if (record.status !== 'pending') {
      throw new ConflictException(
        `La aprobación "${id}" ya fue procesada.`,
      );
    }

    const rejected = await this.transition(
      record,
      'rejected',
      decidedBy,
      note,
      true,
    );

    await this.audit.record({
      tenantId,
      actor: decidedBy,
      eventName: 'approval.rejected',
      entityType: 'approval',
      entityId: id,
      metadata: {
        agentId: record.agentId,
        actionName: record.actionName,
        note,
      },
    });

    return rejected;
  }

  private async execute(record: ApprovalRecord): Promise<unknown> {
    if (record.actionName === 'provider.send_message') {
      const providerId = this.payloadString(record, 'providerId');
      const recipient = this.payloadString(record, 'recipient');
      const text = this.payloadString(record, 'text');

      return this.providers.sendText(
        providerId,
        record.agentId,
        recipient,
        text,
        record.tenantId,
      );
    }

    throw new ConflictException(
      `No existe ejecutor de approval para "${record.actionName}".`,
    );
  }

  private async require(
    id: string,
    tenantId: string,
  ): Promise<ApprovalRecord> {
    if (this.database.enabled) {
      const rows = await this.database.query<ApprovalRow[]>(
        `SELECT *
           FROM approvals
          WHERE id = ? AND tenant_id = ?
          LIMIT 1`,
        [id, tenantId],
      );

      if (!rows[0]) {
        throw new NotFoundException(
          `Aprobación "${id}" no encontrada.`,
        );
      }

      return this.fromRow(rows[0]);
    }

    const record = (await this.readLocal()).find(
      (item) => item.id === id && item.tenantId === tenantId,
    );

    if (!record) {
      throw new NotFoundException(
        `Aprobación "${id}" no encontrada.`,
      );
    }

    return record;
  }

  private async transition(
    record: ApprovalRecord,
    status: ApprovalStatus,
    decidedBy?: string,
    note?: string,
    finalDecision = false,
  ): Promise<ApprovalRecord> {
    const decidedAt = finalDecision
      ? new Date().toISOString()
      : undefined;

    const updated: ApprovalRecord = {
      ...record,
      status,
      decidedBy,
      decisionNote: note,
      decidedAt,
    };

    if (this.database.enabled) {
      const result = await this.database.execute(
        `UPDATE approvals
            SET status = ?,
                decided_by = ?,
                decision_note = ?,
                decided_at = ?
          WHERE id = ? AND tenant_id = ? AND status = ?`,
        [
          status,
          decidedBy ?? null,
          note ?? null,
          decidedAt ? new Date(decidedAt) : null,
          record.id,
          record.tenantId,
          record.status,
        ],
      );

      if (result.affectedRows !== 1) {
        throw new ConflictException(
          'La aprobación cambió de estado mientras se procesaba.',
        );
      }
    } else {
      const all = await this.readLocal();
      const index = all.findIndex(
        (item) =>
          item.id === record.id &&
          item.tenantId === record.tenantId &&
          item.status === record.status,
      );

      if (index < 0) {
        throw new ConflictException(
          'La aprobación cambió de estado mientras se procesaba.',
        );
      }

      all[index] = updated;
      await this.writeLocal(all);
    }

    return updated;
  }

  private fromRow(row: ApprovalRow): ApprovalRecord {
    return {
      id: row.id,
      tenantId:
        row.tenant_id ??
        this.config.get<string>('DEFAULT_TENANT_ID', 'default'),
      agentId: row.agent_id,
      actionName: row.action_name,
      payload: JSON.parse(row.payload_json) as Record<string, unknown>,
      status: row.status,
      requestedBy: row.requested_by ?? undefined,
      decidedBy: row.decided_by ?? undefined,
      decisionNote: row.decision_note ?? undefined,
      createdAt: row.created_at.toISOString(),
      decidedAt: row.decided_at?.toISOString(),
    };
  }

  private payloadString(record: ApprovalRecord, key: string): string {
    const value = record.payload[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new ConflictException(
        `Payload inválido para approval: falta "${key}".`,
      );
    }
    return value.trim();
  }

  private localPath(): string {
    return resolve(
      process.cwd(),
      this.config.get<string>(
        'APPROVALS_DATA_PATH',
        join('data', 'runtime', 'approvals.json'),
      ),
    );
  }

  private async readLocal(): Promise<ApprovalRecord[]> {
    try {
      return JSON.parse(
        await fs.readFile(this.localPath(), 'utf8'),
      ) as ApprovalRecord[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async writeLocal(records: ApprovalRecord[]): Promise<void> {
    const path = this.localPath();
    await fs.mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.tmp`;
    await fs.writeFile(
      temporary,
      JSON.stringify(records, null, 2),
      'utf8',
    );
    await fs.rename(temporary, path);
  }
}
