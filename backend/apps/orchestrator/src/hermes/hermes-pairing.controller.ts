import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { IsString, Matches } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HermesPairingService } from './hermes-pairing.service';

type UserRequest=Request & {user?:AuthenticatedUser};
class PairCodeDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

@Controller('admin/hermes-browser')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class HermesPairingController {
  constructor(private readonly pairing: HermesPairingService) {}
  // Codes are displayed only in the requesting Chrome instance. Showing all
  // unpaired codes would expose other tenants to unwanted authorizations.
  @Get('pending') pending() { return { items: [] }; }
  @Get('devices') async devices(@Req() request: UserRequest) { return { items: await this.pairing.devices(request.user?.tenantId || 'default') }; }
  @Post('approve') approve(@Body() body: PairCodeDto,@Req() request: UserRequest) { return this.pairing.approve(body.code,request.user?.tenantId || 'default'); }
  @Delete('devices/:id') revoke(@Param('id') id: string,@Req() request: UserRequest) { return this.pairing.revoke(id,request.user?.tenantId || 'default'); }
}
