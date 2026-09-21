import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { ProviderRecord } from './provider.types';

@Injectable()
export class ProviderStoreService {
  constructor(private readonly config: ConfigService) {}

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
    try {
      const raw = await fs.readFile(this.registryPath, 'utf8');
      return JSON.parse(raw) as ProviderRecord[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async get(id: string): Promise<ProviderRecord | undefined> {
    return (await this.list()).find((provider) => provider.id === id);
  }

  async save(record: ProviderRecord): Promise<ProviderRecord> {
    const providers = await this.list();
    const index = providers.findIndex((provider) => provider.id === record.id);

    if (index >= 0) providers[index] = record;
    else providers.push(record);

    await this.write(providers);
    return record;
  }

  async remove(id: string): Promise<void> {
    const providers = (await this.list()).filter((provider) => provider.id !== id);
    await this.write(providers);
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

    // Escritura atómica simple: evita dejar JSON incompleto si el proceso cae.
    const temporaryPath = `${this.registryPath}.tmp`;
    await fs.writeFile(
      temporaryPath,
      JSON.stringify(providers, null, 2),
      'utf8',
    );
    await fs.rename(temporaryPath, this.registryPath);
  }
}
