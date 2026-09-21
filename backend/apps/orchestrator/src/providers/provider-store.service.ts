import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from '../database/database.service';
import { ProviderRecord } from './provider.types';

interface ProviderRow extends RowDataPacket {
  tenant_id: string | null;
  record_json: string;
}

@Injectable()
export class ProviderStoreService {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  private get basePath(): string {
    return resolve(
      process.cwd(),
      this.config.get<string>('PROVIDERS_DATA_PATH', 'data/providers'),
    );
  }

  private get registryPath(): string {
    return join(this.basePath, 'providers.json');
  }

  authPath(providerId: string): string {
    return join(this.basePath, 'sessions', providerId);
  }

  async list(tenantId?: string): Promise<ProviderRecord[]> {
    if (this.database.enabled) {
      const rows = tenantId
        ? await this.database.query<ProviderRow[]>(
            `SELECT tenant_id, record_json
               FROM providers
              WHERE tenant_id = ?
              ORDER BY created_at ASC`,
            [tenantId],
          )
        : await this.database.query<ProviderRow[]>(
            `SELECT tenant_id, record_json
               FROM providers
              ORDER BY created_at ASC`,
          );

      return rows.map((row) =>
        this.normalize(
          JSON.parse(row.record_json) as Partial<ProviderRecord>,
          row.tenant_id ?? undefined,
        ),
      );
    }

    try {
      const raw = await fs.readFile(this.registryPath, 'utf8');
      const all = (JSON.parse(raw) as Partial<ProviderRecord>[]).map(
        (provider) => this.normalize(provider),
      );
      return tenantId
        ? all.filter((provider) => provider.tenantId === tenantId)
        : all;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async get(
    id: string,
    tenantId?: string,
  ): Promise<ProviderRecord | undefined> {
    if (this.database.enabled) {
      const rows = tenantId
        ? await this.database.query<ProviderRow[]>(
            `SELECT tenant_id, record_json
               FROM providers
              WHERE id = ? AND tenant_id = ?
              LIMIT 1`,
            [id, tenantId],
          )
        : await this.database.query<ProviderRow[]>(
            `SELECT tenant_id, record_json
               FROM providers
              WHERE id = ?
              LIMIT 1`,
            [id],
          );

      return rows[0]
        ? this.normalize(
            JSON.parse(rows[0].record_json) as Partial<ProviderRecord>,
            rows[0].tenant_id ?? undefined,
          )
        : undefined;
    }

    return (await this.list(tenantId)).find(
      (provider) => provider.id === id,
    );
  }

  async save(record: ProviderRecord): Promise<ProviderRecord> {
    if (this.database.enabled) {
      const createdAt = new Date(record.createdAt);
      const updatedAt = new Date(record.updatedAt);

      await this.database.execute(
        `INSERT INTO providers
          (id, tenant_id, record_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           tenant_id = VALUES(tenant_id),
           record_json = VALUES(record_json),
           updated_at = VALUES(updated_at)`,
        [
          record.id,
          record.tenantId,
          JSON.stringify(record),
          createdAt,
          updatedAt,
        ],
      );

      return record;
    }

    const providers = await this.list();
    const index = providers.findIndex(
      (provider) => provider.id === record.id,
    );

    if (index >= 0) providers[index] = record;
    else providers.push(record);

    await this.write(providers);
    return record;
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    if (this.database.enabled) {
      if (tenantId) {
        await this.database.execute(
          'DELETE FROM providers WHERE id = ? AND tenant_id = ?',
          [id, tenantId],
        );
      } else {
        await this.database.execute(
          'DELETE FROM providers WHERE id = ?',
          [id],
        );
      }
    } else {
      const providers = (await this.list()).filter(
        (provider) =>
          provider.id !== id ||
          Boolean(tenantId && provider.tenantId !== tenantId),
      );
      await this.write(providers);
    }

    await fs.rm(this.authPath(id), { recursive: true, force: true });
  }

  async hasCredentials(id: string): Promise<boolean> {
    try {
      await fs.access(join(this.authPath(id), 'creds.json'));
      return true;
    } catch {
      return false;
    }
  }

  private normalize(
    provider: Partial<ProviderRecord>,
    tenantId?: string,
  ): ProviderRecord {
    const fallbackTenant = this.config.get<string>(
      'DEFAULT_TENANT_ID',
      'default',
    );

    return {
      ...(provider as ProviderRecord),
      tenantId: provider.tenantId ?? tenantId ?? fallbackTenant,
    };
  }

  private async write(providers: ProviderRecord[]): Promise<void> {
    await fs.mkdir(dirname(this.registryPath), { recursive: true });

    const temporaryPath = `${this.registryPath}.tmp`;
    await fs.writeFile(
      temporaryPath,
      JSON.stringify(providers, null, 2),
      'utf8',
    );
    await fs.rename(temporaryPath, this.registryPath);
  }
}
