import { Controller, Get, Param, Post, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ArgosSicOutboxService } from './argos-sic-outbox.service';

type UserRequest = Request & { user?: AuthenticatedUser };

@Controller('argos/outbox')
@UseGuards(AuthGuard, RolesGuard)
export class ArgosSicOutboxController {
  constructor(private readonly outbox: ArgosSicOutboxService) {}

  @Get()
  @Roles('admin', 'operator')
  async list(@Req() request: UserRequest, @Query('limit') limit?: string) {
    const tenantId = request.user?.tenantId || 'default';
    const items = await this.outbox.list(tenantId, Number(limit || 100));
    return {
      items,
      total: items.length,
      pending: items.filter(i => i.status === 'pending' || i.status === 'processing').length,
      failed: items.filter(i => i.status === 'failed').length,
      synced: items.filter(i => i.status === 'synced').length,
    };
  }

  @Post('retry-pending')
  @Roles('admin', 'operator')
  retryPending(@Req() request: UserRequest) {
    return this.outbox.retryPending(request.user?.tenantId || 'default');
  }

  @Post(':id/retry')
  @Roles('admin', 'operator')
  async retry(@Req() request: UserRequest, @Param('id') id: string) {
    try {
      return await this.outbox.retry(id, request.user?.tenantId || 'default');
    } catch (error) {
      if (error instanceof Error && error.message.includes('no encontrado')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
