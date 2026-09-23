import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HermesEvidenceOutboxService } from './hermes-evidence-outbox.service';
type UserRequest=Request&{user?:AuthenticatedUser};
@Controller('hermes/outbox')
@UseGuards(AuthGuard,RolesGuard)
@Roles('admin','operator')
export class HermesOutboxController{
 constructor(private readonly outbox:HermesEvidenceOutboxService){}
 @Get() async list(@Req()request:UserRequest){
  const items=await this.outbox.list(request.user?.tenantId||'default');
  return {items,total:items.length,pending:items.filter(i=>i.status==='pending'||i.status==='processing').length,
  synced:items.filter(i=>i.status==='synced').length,failed:items.filter(i=>i.status==='failed').length};
 }
 @Post('retry-pending') retryAll(@Req()request:UserRequest){
  return this.outbox.retryAll(request.user?.tenantId||'default');
 }
 @Post(':id/retry') retry(@Req()request:UserRequest,@Param('id')id:string){
  return this.outbox.retry(id,request.user?.tenantId||'default');
 }
}
