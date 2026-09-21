import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApprovalStatus } from './approval.types';
import { ApprovalsService } from './approvals.service';

class DecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

@Controller('approvals')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get()
  list(
    @Req()
    request: Request & { user?: AuthenticatedUser },
    @Query('status') status?: ApprovalStatus,
  ) {
    const validStatus =
      status &&
      ['pending', 'processing', 'approved', 'rejected'].includes(status)
        ? status
        : undefined;

    return this.approvals.list(
      request.user?.tenantId ?? 'default',
      validStatus,
    );
  }

  @Post(':id/approve')
  approve(
    @Req()
    request: Request & { user?: AuthenticatedUser },
    @Param('id') id: string,
    @Body() dto: DecisionDto,
  ) {
    const user = request.user!;

    return this.approvals.approve(
      id,
      user.tenantId,
      user.username,
      dto.note,
    );
  }

  @Post(':id/reject')
  reject(
    @Req()
    request: Request & { user?: AuthenticatedUser },
    @Param('id') id: string,
    @Body() dto: DecisionDto,
  ) {
    const user = request.user!;

    return this.approvals.reject(
      id,
      user.tenantId,
      user.username,
      dto.note,
    );
  }
}
