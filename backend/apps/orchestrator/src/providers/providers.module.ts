import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ProviderAdapterCatalogService } from './provider-adapter-catalog.service';
import { ProviderStoreService } from './provider-store.service';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [AuthModule],
  controllers: [ProvidersController],
  providers: [
    ProviderAdapterCatalogService,
    ProviderStoreService,
    ProvidersService,
  ],
  exports: [ProviderAdapterCatalogService, ProvidersService],
})
export class ProvidersModule {}
