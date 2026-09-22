import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { NormalizedProviderMessage } from '../providers/provider-message.types';
import { SicCampaignRunPayload } from './sic-campaign-run.types';

export const AGENT_JOBS_QUEUE = 'agent-jobs';

@Injectable()
export class AgentJobsService {
  constructor(
    @InjectQueue(AGENT_JOBS_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueueProviderMessage(
    message: NormalizedProviderMessage,
  ): Promise<string | undefined> {
    const job = await this.queue.add('provider-message', message, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2_000,
      },
      removeOnComplete: 200,
      removeOnFail: 500,
      jobId: `provider-${message.providerId}-${message.messageId}`,
    });

    return job.id;
  }

  async enqueueSicCampaignRun(run: SicCampaignRunPayload): Promise<string | undefined> {
    const job = await this.queue.add('sic-campaign-run', run, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: 500,
      jobId: 'sic-' + run.execution_id,
    });
    return job.id;
  }

  async stats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
