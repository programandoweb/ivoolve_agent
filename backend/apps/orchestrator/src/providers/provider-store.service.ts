import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from '../database/database.service';
import { ProviderRecord } from './provider.types';

interface ProviderRow extends RowDataPacket {
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

  async list(): Promise<ProviderRecord[]> {
    if (this.database.enabled) {
      const rows = await this.database.query<ProviderRow[]>(
        'SELECT record_json FROM providers ORDER BY created_at ASC',
      );

      return rows.map((row) => JSON.parse(row.record_json) as ProviderRecord);
    }

    try {
      const raw = await fs.readFile(this.registryPath, 'utf8');
      return JSON.parse(raw) as ProviderRecord[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async get(id: string): Promise<ProviderRecord | undefined> {
    if (this.database.enabled) {
      const rows = await this.database.query<ProviderRow[]>(
        'SELECT record_json FROM providers WHERE id = ? LIMIT 1',
        [id],
      );

      return rows[0]
        ? (JSON.parse(rows[0].record_json) as ProviderRecord)
        : undefined;
    }

    return (await this.list()).find((provider) => provider.id === id);
  }

  async save(record: ProviderRecord): Promise<ProviderRecord> {
    if (this.database.enabled) {
      const tenantId = this.config.get<string>(
        'DEFAULT_TENANT_ID',
        'default',
      );
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
          tenantId,
          JSON.stringify(record),
          createdAt,
          updatedAt,
        ],
      );

      return record;
    }

    const providers = await this.list();
    const index = providers.findIndex((provider) => provider.id === record.id);

    if (index >= 0) providers[index] = record;
    else providers.push(record);

    await this.write(providers);
    return record;
  }

  async remove(id: string): Promise<void> {
    if (this.database.enabled) {
      await this.database.execute('DELETE FROM providers WHERE id = ?', [id]);
    } else {
      const providers = (await this.list()).filter(
        (provider) => provider.id !== id,
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
