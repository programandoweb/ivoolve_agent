import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HermesPairingService } from './hermes-pairing.service';
import { HermesPairingController } from './hermes-pairing.controller';
import { HermesBrowserGateway } from './hermes-browser.gateway';
import { HermesBrowserService } from './hermes-browser.service';
import { HermesEvidenceOutboxService } from './hermes-evidence-outbox.service';
import { HermesOutboxController } from './hermes-outbox.controller';
import { SicClientService } from '../tools/sic-client.service';
@Module({
 imports:[AuthModule],
 controllers:[HermesPairingController,HermesOutboxController],
 providers:[HermesPairingService,HermesBrowserGateway,HermesBrowserService,HermesEvidenceOutboxService,SicClientService],
 exports:[HermesBrowserService,HermesEvidenceOutboxService],
})
export class HermesBrowserModule{}
