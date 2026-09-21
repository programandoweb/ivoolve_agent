import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { RuntimeExecutionRecord } from './execution-log.types';

@Injectable()
export class ExecutionLogStore {
  constructor(private readonly config: ConfigService) {}

  async append(record: RuntimeExecutionRecord): Promise<void> {
    const path = this.path();
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.appendFile(path, `${JSON.stringify(record)}\n`, 'utf8');
  }

  async recent(limit = 100): Promise<RuntimeExecutionRecord[]> {
    try {
      const raw = await fs.readFile(this.path(), 'utf8');
      return raw
        .split('\n')
        .filter(Boolean)
        .slice(-Math.max(1, Math.min(limit, 500)))
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
