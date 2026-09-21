import { Controller, Get } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { RedisService } from '../state/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly database: DatabaseService,
  ) {}

  @Get()
  async health() {
    const redis = await this.redis.ping();

    let database: 'disabled' | 'ok' | 'error' = 'disabled';
    if (this.database.enabled) {
      try {
        database = (await this.database.ping()) ? 'ok' : 'error';
      } catch {
        database = 'error';
      }
    }

    return {
      status: database === 'error' ? 'degraded' : 'ok',
      service: 'ivoolve-agent-orchestrator',
      redis,
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
