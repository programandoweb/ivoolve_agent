import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { DatabaseService } from '../database/database.service';

export interface AuditEventInput {
  tenantId?: string;
  actor?: string;
  eventName: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async record(input: AuditEventInput): Promise<void> {
    const tenantId =
      input.tenantId ??
      this.config.get<string>('DEFAULT_TENANT_ID', 'default');
    const createdAt = new Date();

    if (this.database.enabled) {
      await this.database.execute(
        `INSERT INTO audit_events
          (tenant_id, actor, event_name, entity_type, entity_id, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          input.actor ?? null,
          input.eventName,
          input.entityType ?? null,
          input.entityId ?? null,
          input.metadata ? JSON.stringify(input.metadata) : null,
          createdAt,
        ],
      );
      return;
    }

    const path = this.localPath();
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.appendFile(
      path,
      `${JSON.stringify({
        ...input,
        tenantId,
        createdAt: createdAt.toISOString(),
      })}\n`,
      'utf8',
    );
  }

  private localPath(): string {
    return resolve(
      process.cwd(),
      this.config.get<string>(
        'AUDIT_DATA_PATH',
        join('data', 'runtime', 'audit.jsonl'),
      ),
    );
  }
}
