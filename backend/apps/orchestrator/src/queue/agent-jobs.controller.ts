import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { AgentJobsService } from './agent-jobs.service';

@Controller('runtime/jobs')
@UseGuards(AuthGuard)
export class AgentJobsController {
  constructor(private readonly jobs: AgentJobsService) {}

  @Get('stats')
  stats() {
    return this.jobs.stats();
  }
}
