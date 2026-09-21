import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { ProvidersService } from '../providers/providers.service';
import { AgentJobsService } from './agent-jobs.service';

@Injectable()
export class ProviderMessageQueueBridge
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ProviderMessageQueueBridge.name);
  private unsubscribe?: () => void;

  constructor(
    private readonly providers: ProvidersService,
    private readonly jobs: AgentJobsService,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.providers.onIncomingMessage(async (message) => {
      const jobId = await this.jobs.enqueueProviderMessage(message);
      this.logger.debug(
        `Mensaje ${message.messageId} encolado como ${jobId ?? 'sin-id'}.`,
      );
    });
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }
}
