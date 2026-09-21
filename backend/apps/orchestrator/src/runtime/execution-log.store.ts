import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from '../database/database.service';
import { RuntimeExecutionRecord } from './execution-log.types';

interface ExecutionRow extends RowDataPacket {
  record_json: string;
}

@Injectable()
export class ExecutionLogStore {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  async append(record: RuntimeExecutionRecord): Promise<void> {
    if (this.database.enabled) {
      const tenantId = this.config.get<string>(
        'DEFAULT_TENANT_ID',
        'default',
      );

      await this.database.execute(
        `INSERT INTO runtime_executions
          (id, tenant_id, provider_id, agent_id, status, record_json, started_at, finished_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          tenantId,
          record.providerId ?? null,
          record.agentId ?? null,
          record.status,
          JSON.stringify(record),
          new Date(record.startedAt),
          record.finishedAt ? new Date(record.finishedAt) : null,
        ],
      );
      return;
    }

    const path = this.path();
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.appendFile(path, `${JSON.stringify(record)}\n`, 'utf8');
  }

  async recent(limit = 100): Promise<RuntimeExecutionRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.database.enabled) {
      const rows = await this.database.query<ExecutionRow[]>(
        `SELECT record_json
           FROM runtime_executions
          ORDER BY started_at DESC
          LIMIT ${safeLimit}`,
      );

      return rows.map(
        (row) => JSON.parse(row.record_json) as RuntimeExecutionRecord,
      );
    }

    try {
      const raw = await fs.readFile(this.path(), 'utf8');
      return raw
        .split('\n')
        .filter(Boolean)
        .slice(-safeLimit)
        .reverse()
        .map((line) => JSON.parse(line) as RuntimeExecutionRecord);
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
