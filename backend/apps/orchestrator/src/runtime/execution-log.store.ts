import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from '../database/database.service';
import { RuntimeExecutionRecord } from './execution-log.types';

interface ExecutionRow extends RowDataPacket {
  tenant_id: string | null;
  record_json: string;
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
          (id, tenant_id, provider_id, agent_id, status, record_json, started_at, finished_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalized.id,
          tenantId,
          normalized.providerId ?? null,
          normalized.agentId ?? null,
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
  ): Promise<RuntimeExecutionRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.database.enabled) {
      const rows = tenantId
        ? await this.database.query<ExecutionRow[]>(
            `SELECT tenant_id, record_json
               FROM runtime_executions
              WHERE tenant_id = ?
              ORDER BY started_at DESC
              LIMIT ${safeLimit}`,
            [tenantId],
          )
        : await this.database.query<ExecutionRow[]>(
            `SELECT tenant_id, record_json
               FROM runtime_executions
              ORDER BY started_at DESC
              LIMIT ${safeLimit}`,
          );

      return rows.map((row) => ({
        ...(JSON.parse(row.record_json) as RuntimeExecutionRecord),
        tenantId:
          (JSON.parse(row.record_json) as RuntimeExecutionRecord).tenantId ??
          row.tenant_id ??
          this.config.get<string>('DEFAULT_TENANT_ID', 'default'),
      }));
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

      const filtered = tenantId
        ? items.filter((item) => item.tenantId === tenantId)
        : items;

      return filtered.slice(-safeLimit).reverse();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private path(): string {
    const base = resolve(
      process.cwd(),
      this.config.get<string>('RUNTIME_DATA_PATH', 'data/runtime'),
    );
    return join(base, 'executions.jsonl');
  }
}
