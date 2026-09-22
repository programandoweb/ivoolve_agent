import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from '../database/database.service';
import {
  RuntimeExecutionEvent,
  RuntimeExecutionRecord,
} from './execution-log.types';

interface ExecutionRow extends RowDataPacket {
  tenant_id: string | null;
  record_json: string;
}

interface EventRow extends RowDataPacket {
  id: number;
  execution_id: string;
  tenant_id: string | null;
  level: string;
  stage: string;
  message: string;
  data_json: string | null;
  created_at: Date;
}

@Injectable()
export class ExecutionLogStore {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  async append(record: RuntimeExecutionRecord): Promise<void> {
    const tenantId =
      record.tenantId ??
      this.config.get<string>('DEFAULT_TENANT_ID', 'default');

    const normalized: RuntimeExecutionRecord = {
      ...record,
      tenantId,
    };

    if (this.database.enabled) {
      await this.database.execute(
        `INSERT INTO runtime_executions
          (id, tenant_id, provider_id, agent_id, source, correlation_id, campaign_id, current_stage, status, record_json, started_at, finished_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           tenant_id = VALUES(tenant_id),
           provider_id = VALUES(provider_id),
           agent_id = VALUES(agent_id),
           source = VALUES(source),
           correlation_id = VALUES(correlation_id),
           campaign_id = VALUES(campaign_id),
           current_stage = VALUES(current_stage),
           status = VALUES(status),
           record_json = VALUES(record_json),
           started_at = VALUES(started_at),
           finished_at = VALUES(finished_at)`,
        [
          normalized.id,
          tenantId,
          normalized.providerId ?? null,
          normalized.agentId ?? null,
          normalized.source ?? null,
          normalized.correlationId ?? null,
          normalized.campaignId ?? null,
          normalized.currentStage ?? null,
          normalized.status,
          JSON.stringify(normalized),
          new Date(normalized.startedAt),
          normalized.finishedAt ? new Date(normalized.finishedAt) : null,
        ],
      );
      return;
    }

    const path = this.path();
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.appendFile(
      path,
      `${JSON.stringify(normalized)}\n`,
      'utf8',
    );
  }

  async recent(
    limit = 100,
    tenantId?: string,
    agentId?: string,
  ): Promise<RuntimeExecutionRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.database.enabled) {
      const filters: string[] = [];
      const params: Array<string> = [];
      if (tenantId) {
        filters.push('tenant_id = ?');
        params.push(tenantId);
      }
      if (agentId) {
        filters.push('agent_id = ?');
        params.push(agentId);
      }
      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      const rows = await this.database.query<ExecutionRow[]>(
        `SELECT tenant_id, record_json
           FROM runtime_executions
           ${where}
          ORDER BY started_at DESC
          LIMIT ${safeLimit}`,
        params,
      );

      return rows.map((row) => this.normalizeRow(row));
    }

    try {
      const raw = await fs.readFile(this.path(), 'utf8');
      const items = raw
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as RuntimeExecutionRecord)
        .map((item) => ({
          ...item,
          tenantId:
            item.tenantId ??
            this.config.get<string>('DEFAULT_TENANT_ID', 'default'),
        }));

      const filtered = items.filter((item) => {
        if (tenantId && item.tenantId !== tenantId) return false;
        if (agentId && item.agentId !== agentId) return false;
        return true;
      });

      return filtered.slice(-safeLimit).reverse();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async detail(
    id: string,
    tenantId?: string,
  ): Promise<{
    execution: RuntimeExecutionRecord;
    events: RuntimeExecutionEvent[];
  } | null> {
    if (!this.database.enabled) {
      const execution = (await this.recent(500, tenantId)).find(
        (item) => item.id === id,
      );
      return execution ? { execution, events: [] } : null;
    }

    const filters = ['id = ?'];
    const params: string[] = [id];
    if (tenantId) {
      filters.push('tenant_id = ?');
      params.push(tenantId);
    }
    const rows = await this.database.query<ExecutionRow[]>(
      `SELECT tenant_id, record_json
         FROM runtime_executions
        WHERE ${filters.join(' AND ')}
        LIMIT 1`,
      params,
    );
    if (!rows[0]) return null;

    const eventRows = await this.database.query<EventRow[]>(
      `SELECT id, execution_id, tenant_id, level, stage, message, data_json, created_at
         FROM runtime_execution_events
        WHERE execution_id = ?
          ${tenantId ? 'AND tenant_id = ?' : ''}
        ORDER BY id ASC
        LIMIT 2000`,
      tenantId ? [id, tenantId] : [id],
    );

    return {
      execution: this.normalizeRow(rows[0]),
      events: eventRows.map((row) => ({
        id: row.id,
        executionId: row.execution_id,
        tenantId: row.tenant_id ?? undefined,
        level: row.level,
        stage: row.stage,
        message: row.message,
        data: row.data_json ? JSON.parse(row.data_json) : undefined,
        createdAt: new Date(row.created_at).toISOString(),
      })),
    };
  }

  private normalizeRow(row: ExecutionRow): RuntimeExecutionRecord {
    const parsed = JSON.parse(row.record_json) as RuntimeExecutionRecord;
    return {
      ...parsed,
      tenantId:
        parsed.tenantId ??
        row.tenant_id ??
        this.config.get<string>('DEFAULT_TENANT_ID', 'default'),
    };
  }

  private path(): string {
    const base = resolve(
      process.cwd(),
      this.config.get<string>('RUNTIME_DATA_PATH', 'data/runtime'),
    );
    return join(base, 'executions.jsonl');
  }
}
