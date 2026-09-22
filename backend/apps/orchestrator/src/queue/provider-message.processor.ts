import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { NormalizedProviderMessage } from '../providers/provider-message.types';
import { ProviderRoutingService } from '../runtime/provider-routing.service';
import { AGENT_JOBS_QUEUE } from './agent-jobs.service';
import { SicCampaignRunService } from './sic-campaign-run.service';
import { SicCampaignRunPayload } from './sic-campaign-run.types';

@Processor(AGENT_JOBS_QUEUE, { concurrency: 5 })
export class ProviderMessageProcessor extends WorkerHost {
  constructor(
    private readonly routing: ProviderRoutingService,
    private readonly sicCampaigns: SicCampaignRunService,
  ) {
    super();
  }

  async process(job: Job<NormalizedProviderMessage | SicCampaignRunPayload>): Promise<void> {
    if (job.name === 'provider-message') {
      await this.routing.handle(job.data as NormalizedProviderMessage);
      return;
    }
    if (job.name === 'sic-campaign-run') {
      await this.sicCampaigns.handle(job.data as SicCampaignRunPayload);
    }
  }
}
