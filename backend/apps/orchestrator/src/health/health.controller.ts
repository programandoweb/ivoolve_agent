import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../state/redis.service';

@Controller('health')
export class HealthController {
  constructor(private readonly redis: RedisService) {}

  @Get()
  async health() {
    // PING permite comprobar que no solo NestJS, sino también Redis, está operativo.
    const redis = await this.redis.ping();

    return {
      status: 'ok',
      service: 'ivoolve-agent-orchestrator',
      redis,
      timestamp: new Date().toISOString(),
    };
  }
}
