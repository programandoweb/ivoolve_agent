import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ArgosPairingService } from './argos-pairing.service';

class PairCodeDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

@Controller('admin/argos-browser')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class ArgosPairingController {
  constructor(private readonly pairing: ArgosPairingService) {}
  @Get('pending') pending() { return { items: this.pairing.list() }; }
  @Get('devices') async devices() { return { items: await this.pairing.devices() }; }
  @Post('approve') approve(@Body() body: PairCodeDto) { return this.pairing.approve(body.code); }
  @Delete('devices/:id') revoke(@Param('id') id: string) { return this.pairing.revoke(id); }
}
