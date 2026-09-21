import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Request } from 'express';

import { AuditService } from '../audit/audit.service';
import { AuthGuard } from './auth.guard';
import { AuthenticatedUser, UserRole } from './auth.types';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UsersService } from './users.service';

class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @IsIn(['admin', 'operator', 'viewer'])
  role!: UserRole;
}

class UpdateUserDto {
  @IsOptional()
  @IsIn(['admin', 'operator', 'viewer'])
  role?: UserRole;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password?: string;
}

class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug!: string;
}

type AuthRequest = Request & { user?: AuthenticatedUser };

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Get('users')
  listUsers(@Req() request: AuthRequest) {
    return this.users.listUsers(
      request.user?.tenantId ?? 'default',
    );
  }

  @Post('users')
  async createUser(
    @Req() request: AuthRequest,
    @Body() dto: CreateUserDto,
  ) {
    const actor = request.user!;
    const created = await this.users.createUser({
      tenantId: actor.tenantId,
      username: dto.username.trim(),
      password: dto.password,
      role: dto.role,
    });

    await this.audit.record({
      tenantId: actor.tenantId,
      actor: actor.username,
      eventName: 'user.created',
      entityType: 'user',
      entityId: created.id,
      metadata: {
        username: created.username,
        role: created.role,
      },
    });

    return created;
  }

  @Patch('users/:id')
  async updateUser(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const actor = request.user!;
    const updated = await this.users.updateUser(
      id,
      actor.tenantId,
      dto,
    );

    await this.audit.record({
      tenantId: actor.tenantId,
      actor: actor.username,
      eventName: 'user.updated',
      entityType: 'user',
      entityId: id,
      metadata: {
        role: dto.role,
        status: dto.status,
        passwordChanged: Boolean(dto.password),
      },
    });

    return updated;
  }

  @Get('tenants')
  listTenants(@Req() request: AuthRequest) {
    this.requirePlatformAdmin(request.user!);
    return this.users.listTenants();
  }

  @Post('tenants')
  async createTenant(
    @Req() request: AuthRequest,
    @Body() dto: CreateTenantDto,
  ) {
    const actor = request.user!;
    this.requirePlatformAdmin(actor);
    const created = await this.users.createTenant(dto.name, dto.slug);

    await this.audit.record({
      tenantId: actor.tenantId,
      actor: actor.username,
      eventName: 'tenant.created',
      entityType: 'tenant',
      entityId: created.id,
      metadata: {
        slug: created.slug,
        name: created.name,
      },
    });

    return created;
  }

  private requirePlatformAdmin(user: AuthenticatedUser): void {
    if (user.id !== 'bootstrap-admin') {
      throw new ForbiddenException(
        'Solo el administrador bootstrap puede gestionar tenants.',
      );
    }
  }
}
