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
  constructor(private readonly users: UsersService) {}

  @Get('users')
  listUsers(@Req() request: AuthRequest) {
    return this.users.listUsers(
      request.user?.tenantId ?? 'default',
    );
  }

  @Post('users')
  createUser(@Req() request: AuthRequest, @Body() dto: CreateUserDto) {
    const user = request.user!;

    return this.users.createUser({
      tenantId: user.tenantId,
      username: dto.username.trim(),
      password: dto.password,
      role: dto.role,
    });
  }

  @Patch('users/:id')
  updateUser(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = request.user!;

    return this.users.updateUser(id, user.tenantId, dto);
  }

  @Get('tenants')
  listTenants(@Req() request: AuthRequest) {
    this.requirePlatformAdmin(request.user!);
    return this.users.listTenants();
  }

  @Post('tenants')
  createTenant(
    @Req() request: AuthRequest,
    @Body() dto: CreateTenantDto,
  ) {
    this.requirePlatformAdmin(request.user!);
    return this.users.createTenant(dto.name, dto.slug);
  }

  private requirePlatformAdmin(user: AuthenticatedUser): void {
    if (user.id !== 'bootstrap-admin') {
      throw new ForbiddenException(
        'Solo el administrador bootstrap puede gestionar tenants.',
      );
    }
  }
}
