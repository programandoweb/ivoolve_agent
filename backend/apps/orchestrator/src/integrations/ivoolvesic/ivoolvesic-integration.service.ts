import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, timingSafeEqual } from 'crypto';

import { AgentRuntimeService } from '../../agents/agent-runtime.service';
import { ExecutionTraceService } from '../../database/execution-trace.service';
import { AgentJobsService } from '../../queue/agent-jobs.service';
import { SicCampaignRunPayload } from '../../queue/sic-campaign-run.types';
import { SicResearchRunPayload } from '../../queue/sic-research-run.types';

@Injectable()
export class IvoolveSicIntegrationService {
  constructor(
    private readonly config: ConfigService,
    private readonly jobs: AgentJobsService,
    private readonly traces: ExecutionTraceService,
    private readonly runtime: AgentRuntimeService,
  ) {}

  assertServiceToken(authorization?: string): void {
    const expected = this.config.get<string>('IVOOLVE_SIC_SERVICE_TOKEN')?.trim();
    const received = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!expected || !received) throw new UnauthorizedException();
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
  }

  async testTask(agentId: string, message: string) {
    const executionId = randomUUID();
    const sessionId = `sic-test-${executionId}`;

    await this.traces.start({
      id: executionId,
      agentId,
      source: 'ivoolve_sic_test',
      input: { message },
      metadata: { integration: 'ivoolvesic', test: true },
    });

    try {
      const result = await this.runtime.chatAsAgent(sessionId, message, agentId, {
        source: 'integration',
        executionId,
      });
      await this.traces.finish(executionId, 'completed', {
        stage: 'completed',
        output: result,
      });
      return { executionId, ...result };
    } catch (error) {
      await this.traces.finish(executionId, 'failed', {
        stage: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async enqueueResearch(run: SicResearchRunPayload) {
    await this.traces.start({
      id: run.researchId,
      agentId: run.agentId,
      source: 'ivoolve_sic_research',
      input: run,
      metadata: {
        integration: 'ivoolvesic',
        prospectId: run.prospectId,
        researchId: run.researchId,
      },
    });

    try {
      const jobId = await this.jobs.enqueueSicResearchRun(run);
      await this.traces.event(run.researchId, {
        stage: 'queue.enqueued',
        message: 'La investigación fue encolada en BullMQ.',
        data: {
          jobId,
          prospectId: run.prospectId,
          agentId: run.agentId,
        },
      });
      return { accepted: true, research_id: run.researchId, job_id: jobId };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.traces.finish(run.researchId, 'failed', {
        stage: 'queue.failed',
        error: reason,
      });
      throw error;
    }
  }

  async enqueue(run: SicCampaignRunPayload) {
    await this.traces.start({
      id: run.execution_id,
      agentId: run.agent_id,
      source: 'ivoolve_sic',
      correlationId: run.correlation_id,
      campaignId: run.campaign_id,
      input: run,
      metadata: { integration: 'ivoolvesic' },
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
