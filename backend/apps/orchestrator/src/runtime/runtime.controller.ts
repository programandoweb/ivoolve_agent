import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { ExecutionLogStore } from './execution-log.store';
import { RuntimeMetricsService } from './runtime-metrics.service';

@Controller('runtime')
@UseGuards(AuthGuard)
export class RuntimeController {
  constructor(
    private readonly executions: ExecutionLogStore,
    private readonly metrics: RuntimeMetricsService,
  ) {}

  @Get('executions')
  async recent(@Query('limit') limit?: string) {
    const parsed = Number(limit ?? 100);
    const items = await this.executions.recent(
      Number.isFinite(parsed) ? parsed : 100,
    );

    return {
      items,
      count: items.length,
      failed: items.filter((item) => item.status === 'failed').length,
      completed: items.filter((item) => item.status === 'completed').length,
    };
  }

  @Get('metrics')
  metricsSnapshot() {
    return this.metrics.snapshot();
  }
}
