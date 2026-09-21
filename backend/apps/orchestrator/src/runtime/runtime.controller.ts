import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { ExecutionLogStore } from './execution-log.store';
import { RuntimeMetricsService } from './runtime-metrics.service';

type AuthRequest = Request & { user?: AuthenticatedUser };

@Controller('runtime')
@UseGuards(AuthGuard)
export class RuntimeController {
  constructor(
    private readonly executions: ExecutionLogStore,
    private readonly metrics: RuntimeMetricsService,
  ) {}

  @Get('executions')
  async recent(
    @Req() request: AuthRequest,
    @Query('limit') limit?: string,
  ) {
    const parsed = Number(limit ?? 100);
    const tenantId = request.user?.tenantId ?? 'default';
    const items = await this.executions.recent(
      Number.isFinite(parsed) ? parsed : 100,
      tenantId,
    );

    return {
      items,
      count: items.length,
      failed: items.filter((item) => item.status === 'failed').length,
      completed: items.filter((item) => item.status === 'completed').length,
    };
  }

  @Get('metrics')
  metricsSnapshot(@Req() request: AuthRequest) {
    return this.metrics.snapshot(
      request.user?.tenantId ?? 'default',
    );
  }
}
