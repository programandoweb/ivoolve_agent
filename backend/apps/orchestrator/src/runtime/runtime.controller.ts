import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
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
    @Query('agentId') agentId?: string,
  ) {
    const parsed = Number(limit ?? 100);
    const tenantId = request.user?.tenantId ?? 'default';
    const items = await this.executions.recent(
      Number.isFinite(parsed) ? parsed : 100,
      tenantId,
      agentId?.trim() || undefined,
    );

    return {
      items,
      count: items.length,
      failed: items.filter((item) => item.status === 'failed').length,
      completed: items.filter((item) => item.status === 'completed').length,
    };
  }

  @Get('executions/:id')
  async detail(
    @Req() request: AuthRequest,
    @Param('id') id: string,
  ) {
    const tenantId = request.user?.tenantId ?? 'default';
    const detail = await this.executions.detail(id, tenantId);
    if (!detail) {
      throw new NotFoundException('Ejecución inexistente.');
    }
    return detail;
  }

  @Delete('executions/:id')
  async remove(
    @Req() request: AuthRequest,
    @Param('id') id: string,
  ) {
    const tenantId = request.user?.tenantId ?? 'default';
    const deleted = await this.executions.delete(id, tenantId);
    if (!deleted) {
      throw new NotFoundException('Ejecución inexistente.');
    }
    return { ok: true, id };
  }

  @Get('metrics')
  metricsSnapshot(@Req() request: AuthRequest) {
    return this.metrics.snapshot(
      request.user?.tenantId ?? 'default',
    );
  }
}
