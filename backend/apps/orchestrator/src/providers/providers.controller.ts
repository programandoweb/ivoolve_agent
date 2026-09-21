import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProvidersService } from './providers.service';

@Controller('providers')
@UseGuards(AuthGuard, RolesGuard)
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  list() {
    return this.providers.list();
  }

  @Post()
  @Roles('admin', 'operator')
  create(@Body() dto: CreateProviderDto) {
    return this.providers.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.providers.get(id);
  }

  @Patch(':id')
  @Roles('admin', 'operator')
  update(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    return this.providers.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.providers.remove(id);
  }

  @Post(':id/connect')
  @Roles('admin', 'operator')
  connect(@Param('id') id: string) {
    return this.providers.connect(id);
  }

  @Post(':id/disconnect')
  @Roles('admin', 'operator')
  disconnect(@Param('id') id: string) {
    return this.providers.disconnect(id);
  }

  @Get(':id/connection')
  connection(@Param('id') id: string) {
    return this.providers.connection(id);
  }
}
