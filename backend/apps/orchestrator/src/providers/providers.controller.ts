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
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProvidersService } from './providers.service';

@Controller('providers')
@UseGuards(AuthGuard)
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  list() {
    return this.providers.list();
  }

  @Post()
  create(@Body() dto: CreateProviderDto) {
    return this.providers.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.providers.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    return this.providers.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.providers.remove(id);
  }

  @Post(':id/connect')
  connect(@Param('id') id: string) {
    return this.providers.connect(id);
  }

  @Post(':id/disconnect')
  disconnect(@Param('id') id: string) {
    return this.providers.disconnect(id);
  }

  @Get(':id/connection')
  connection(@Param('id') id: string) {
    return this.providers.connection(id);
  }
}
