import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProvidersService } from './providers.service';

type AuthRequest = Request & { user?: AuthenticatedUser };

@Controller('providers')
@UseGuards(AuthGuard, RolesGuard)
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  list(@Req() request: AuthRequest) {
    return this.providers.list(request.user?.tenantId ?? 'default');
  }

  @Post()
  @Roles('admin', 'operator')
  create(@Req() request: AuthRequest, @Body() dto: CreateProviderDto) {
    return this.providers.create(
      dto,
      request.user?.tenantId ?? 'default',
    );
  }

  @Get(':id')
  get(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.providers.get(
      id,
      request.user?.tenantId ?? 'default',
    );
  }

  @Patch(':id')
  @Roles('admin', 'operator')
  update(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.providers.update(
      id,
      dto,
      request.user?.tenantId ?? 'default',
    );
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async remove(@Req() request: AuthRequest, @Param('id') id: string) {
    await this.providers.remove(
      id,
      request.user?.tenantId ?? 'default',
    );
  }

  @Post(':id/connect')
  @Roles('admin', 'operator')
  connect(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.providers.connect(
      id,
      request.user?.tenantId ?? 'default',
    );
  }

  @Post(':id/disconnect')
  @Roles('admin', 'operator')
  disconnect(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.providers.disconnect(
      id,
      true,
      request.user?.tenantId ?? 'default',
    );
  }

  @Get(':id/connection')
  connection(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.providers.connection(
      id,
      request.user?.tenantId ?? 'default',
    );
  }
}
