import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { NormalizedProviderMessage } from '../providers/provider-message.types';
import { ProviderRoutingService } from '../runtime/provider-routing.service';
import { AGENT_JOBS_QUEUE } from './agent-jobs.service';

@Processor(AGENT_JOBS_QUEUE, {
  concurrency: 5,
})
export class ProviderMessageProcessor extends WorkerHost {
  constructor(private readonly routing: ProviderRoutingService) {
    super();
  }

  async process(job: Job<NormalizedProviderMessage>): Promise<void> {
    if (job.name !== 'provider-message') return;
    await this.routing.handle(job.data);
  }
}
