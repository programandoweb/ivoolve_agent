import {
  Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ArgosTaskTemplatesService, type TemplateInput } from './argos-task-templates.service';

class TemplateDto implements TemplateInput {
  @IsString() @MinLength(2) @MaxLength(140) title!: string;
  @IsString() @MinLength(2) @MaxLength(600) description!: string;
  @IsString() @MinLength(2) @MaxLength(120) sector!: string;
  @IsString() @MinLength(2) @MaxLength(120) defaultCity!: string;
  @IsString() @MinLength(2) @MaxLength(120) defaultDepartment!: string;
  @IsInt() @Min(1) @Max(100) defaultQuantity!: number;
  @IsString() @MinLength(30) @MaxLength(8000) promptTemplate!: string;
}
class PrepareDto {
  @IsString() @MinLength(2) @MaxLength(120) sector!: string;
  @IsString() @MinLength(2) @MaxLength(120) city!: string;
  @IsString() @MinLength(2) @MaxLength(120) department!: string;
  @IsInt() @Min(1) @Max(100) quantity!: number;
}
type UserRequest = Request & { user?: AuthenticatedUser };
@Controller('argos/templates')
@UseGuards(AuthGuard, RolesGuard)
export class ArgosTaskTemplatesController {
  constructor(private readonly templates: ArgosTaskTemplatesService) {}
  @Get()
  @Roles('admin', 'operator', 'viewer')
  list(@Req() req: UserRequest) { return this.templates.list(req.user?.tenantId || 'default'); }

  @Post(':id/prepare')
  @Roles('admin', 'operator')
  prepare(@Req() req: UserRequest, @Param('id') id: string, @Body() body: PrepareDto) {
    return this.templates.prepare(req.user?.tenantId || 'default', id, body);
  }

  @Post()
  @Roles('admin', 'operator')
  create(@Req() req: UserRequest, @Body() body: TemplateDto) {
    return this.templates.create(body, req.user?.tenantId || 'default', req.user?.id);
  }

  @Patch(':id')
  @Roles('admin', 'operator')
  update(@Req() req: UserRequest, @Param('id') id: string, @Body() body: TemplateDto) {
    return this.templates.update(id, body, req.user?.tenantId || 'default');
  }

  @Delete(':id')
  @Roles('admin', 'operator')
  remove(@Req() req: UserRequest, @Param('id') id: string) {
    return this.templates.remove(id, req.user?.tenantId || 'default');
  }
}
