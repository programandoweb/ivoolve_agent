import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from './database.service';

export interface ExecutionTraceStartInput {
  id: string;
  tenantId?: string;
  agentId?: string;
  source: string;
  correlationId?: string;
  campaignId?: string;
  input?: unknown;
  metadata?: Record<string, unknown>;
}

export interface ExecutionTraceEventInput {
  level?: 'debug' | 'info' | 'warning' | 'error';
  stage: string;
  message: string;
  data?: unknown;
  createdAt?: string;
}

interface ExecutionRecordRow extends RowDataPacket {
  record_json: string;
  started_at: Date;
}

@Injectable()
export class ExecutionTraceService {
  private readonly logger = new Logger(ExecutionTraceService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async start(input: ExecutionTraceStartInput): Promise<void> {
    if (!this.database.enabled) return;

    const tenantId =
      input.tenantId ??
      this.config.get<string>('DEFAULT_TENANT_ID', 'default');
    const now = new Date();
    const record = {
      id: input.id,
      tenantId,
      agentId: input.agentId,
      source: input.source,
      correlationId: input.correlationId,
      campaignId: input.campaignId,
      status: 'received',
      currentStage: 'received',
      inputPreview: this.preview(input.input),
      metadata: input.metadata ?? {},
      startedAt: now.toISOString(),
    };

    try {
      await this.database.execute(
        `INSERT INTO runtime_executions
          (id, tenant_id, provider_id, agent_id, source, correlation_id, campaign_id, current_stage, status, record_json, started_at, finished_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, 'received', 'received', ?, ?, NULL)
         ON DUPLICATE KEY UPDATE
           tenant_id = VALUES(tenant_id),
           agent_id = VALUES(agent_id),
           source = VALUES(source),
           correlation_id = VALUES(correlation_id),
           campaign_id = VALUES(campaign_id),
           current_stage = VALUES(current_stage),
           status = VALUES(status),
           record_json = VALUES(record_json),
           finished_at = NULL`,
        [
          input.id,
          tenantId,
          input.agentId ?? null,
          input.source,
          input.correlationId ?? null,
          input.campaignId ?? null,
          JSON.stringify(record),
          now,
        ],
      );
      await this.event(input.id, {
        stage: 'received',
        message: 'Ejecución recibida por el orquestador.',
        data: {
          agentId: input.agentId,
          source: input.source,
          correlationId: input.correlationId,
          campaignId: input.campaignId,
          input: input.input,
          metadata: input.metadata,
        },
      }, tenantId);
    } catch (error) {
      this.logger.error(
        `No se pudo iniciar la trazabilidad ${input.id}: ${this.errorMessage(error)}`,
      );
    }
  }

  async event(
    executionId: string,
    input: ExecutionTraceEventInput,
    tenantId?: string,
  ): Promise<void> {
    if (!this.database.enabled) return;

    const resolvedTenant =
      tenantId ??
      this.config.get<string>('DEFAULT_TENANT_ID', 'default');
    const createdAt = input.createdAt
      ? new Date(input.createdAt)
      : new Date();

    try {
      await this.database.execute(
        `INSERT INTO runtime_execution_events
          (execution_id, tenant_id, level, stage, message, data_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          executionId,
          resolvedTenant,
          input.level ?? 'info',
          input.stage,
          input.message,
          input.data === undefined ? null : JSON.stringify(input.data),
          createdAt,
        ],
      );
      await this.database.execute(
        `UPDATE runtime_executions
            SET current_stage = ?, status = CASE
              WHEN status IN ('completed', 'failed', 'ignored') THEN status
              ELSE 'processing'
            END
          WHERE id = ?`,
        [input.stage, executionId],
      );
    } catch (error) {
      this.logger.error(
        `No se pudo registrar evento de trazabilidad ${executionId}: ${this.errorMessage(error)}`,
      );
    }
  }

  async finish(
    executionId: string,
    status: 'completed' | 'failed' | 'ignored',
    detail: {
      output?: unknown;
      error?: string;
      stage?: string;
      tenantId?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<void> {
    if (!this.database.enabled) return;

    try {
      const rows = await this.database.query<ExecutionRecordRow[]>(
        'SELECT record_json, started_at FROM runtime_executions WHERE id = ? LIMIT 1',
        [executionId],
      );
      if (!rows[0]) return;

      const now = new Date();
      const previous = JSON.parse(rows[0].record_json) as Record<string, unknown>;
      const durationMs = Math.max(
        0,
        now.getTime() - new Date(rows[0].started_at).getTime(),
      );
      const record = {
        ...previous,
        status,
        currentStage: detail.stage ?? status,
        outputPreview: this.preview(detail.output),
        ...(detail.error ? { error: detail.error } : {}),
        ...(detail.metadata ? { metadata: { ...(previous.metadata as object ?? {}), ...detail.metadata } } : {}),
        finishedAt: now.toISOString(),
        durationMs,
      };

      await this.database.execute(
        `UPDATE runtime_executions
            SET status = ?, current_stage = ?, record_json = ?, finished_at = ?
          WHERE id = ?`,
        [
          status,
          detail.stage ?? status,
          JSON.stringify(record),
          now,
          executionId,
        ],
      );
      await this.event(
        executionId,
        {
          level: status === 'failed' ? 'error' : 'info',
          stage: detail.stage ?? status,
          message:
            status === 'failed'
              ? 'La ejecución terminó con error.'
              : 'La ejecución terminó correctamente.',
          data: {
            output: detail.output,
            error: detail.error,
            durationMs,
            metadata: detail.metadata,
          },
        },
        detail.tenantId,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo cerrar trazabilidad ${executionId}: ${this.errorMessage(error)}`,
      );
    }
  }

  newId(prefix = 'exec'): string {
    return `${prefix}:${randomUUID()}`;
  }

  private preview(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    const text =
      typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
