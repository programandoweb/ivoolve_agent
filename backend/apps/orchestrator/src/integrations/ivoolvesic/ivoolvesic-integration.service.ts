import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

import { ExecutionTraceService } from '../../database/execution-trace.service';
import { AgentJobsService } from '../../queue/agent-jobs.service';
import { SicCampaignRunPayload } from '../../queue/sic-campaign-run.types';

@Injectable()
export class IvoolveSicIntegrationService {
  constructor(
    private readonly config: ConfigService,
    private readonly jobs: AgentJobsService,
    private readonly traces: ExecutionTraceService,
  ) {}

  assertServiceToken(authorization?: string): void {
    const expected = this.config.get<string>('IVOOLVE_SIC_SERVICE_TOKEN')?.trim();
    const received = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!expected || !received) throw new UnauthorizedException();
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
  }

  async enqueue(run: SicCampaignRunPayload) {
    await this.traces.start({
      id: run.execution_id,
      agentId: run.agent_id,
      source: 'ivoolve_sic',
      correlationId: run.correlation_id,
      campaignId: run.campaign_id,
      input: run,
      metadata: {
        integration: 'ivoolvesic',
      },
    });

    try {
      const jobId = await this.jobs.enqueueSicCampaignRun(run);
      await this.traces.event(run.execution_id, {
        stage: 'queue.enqueued',
        message: 'La ejecución fue encolada en BullMQ.',
        data: { jobId },
      });
      return { accepted: true, execution_id: run.execution_id, job_id: jobId };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.traces.finish(run.execution_id, 'failed', {
        stage: 'queue.failed',
        error: reason,
      });
      throw error;
    }
  }
}
