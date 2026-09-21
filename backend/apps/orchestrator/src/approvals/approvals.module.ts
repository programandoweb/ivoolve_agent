import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ProvidersModule } from '../providers/providers.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [AuthModule, ProvidersModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
