import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ProviderStoreService } from './provider-store.service';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [AuthModule],
  controllers: [ProvidersController],
  providers: [ProviderStoreService, ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
