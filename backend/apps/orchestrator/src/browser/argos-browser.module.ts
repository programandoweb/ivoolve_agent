import { Module } from '@nestjs/common';
import { ArgosPairingService } from './argos-pairing.service';
import { ArgosPairingController } from './argos-pairing.controller';
import { AuthModule } from '../auth/auth.module';
import { ArgosBrowserGateway } from './argos-browser.gateway';
import { ArgosBrowserService } from './argos-browser.service';

@Module({
  imports: [AuthModule],
  controllers: [ArgosPairingController],
  providers: [ArgosBrowserService, ArgosBrowserGateway, ArgosPairingService],
  exports: [ArgosBrowserService],
})
export class ArgosBrowserModule {}
