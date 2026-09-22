import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { AgentJobsService } from '../../queue/agent-jobs.service';
import { SicCampaignRunPayload } from '../../queue/sic-campaign-run.types';

@Injectable()
export class IvoolveSicIntegrationService {
  constructor(
    private readonly config: ConfigService,
    private readonly jobs: AgentJobsService,
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
    const jobId = await this.jobs.enqueueSicCampaignRun(run);
    return { accepted: true, execution_id: run.execution_id, job_id: jobId };
  }
}
