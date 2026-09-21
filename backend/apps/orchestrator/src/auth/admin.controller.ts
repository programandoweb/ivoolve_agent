import {
  Body,
  Controller,
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
  @MinLength(1)
  tenantId!: string;

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

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly users: UsersService) {}

  @Get('users')
  listUsers(
    @Req()
    request: Request & {
      user?: AuthenticatedUser;
    },
  ) {
    // El admin bootstrap/default ve su tenant. Un futuro super-admin explícito
    // podrá ampliar este alcance sin mezclar tenants accidentalmente.
    return this.users.listUsers(request.user?.tenantId ?? 'default');
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.users.createUser({
      tenantId: dto.tenantId,
      username: dto.username.trim(),
      password: dto.password,
      role: dto.role,
    });
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(id, dto);
  }

  @Get('tenants')
  listTenants() {
    return this.users.listTenants();
  }

  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.users.createTenant(dto.name, dto.slug);
  }
}
