import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { ToolsModule } from '../tools/tools.module';
import { ArgosTaskTemplatesService } from './argos-task-templates.service';
import { ArgosTaskTemplatesController } from './argos-task-templates.controller';
import { AgentBuilderService } from './agent-builder.service';
import { AgentConversationStoreService } from './agent-conversation-store.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { AgentsController } from './agents.controller';
import { AgentsGateway } from './agents.gateway';
import { ManagedAgentStoreService } from './managed-agent-store.service';

@Module({
  imports: [AuthModule, LlmModule, ToolsModule],
  controllers: [AgentsController, ArgosTaskTemplatesController],
  providers: [
    ArgosTaskTemplatesService,
    ManagedAgentStoreService,
    AgentConversationStoreService,
    AgentRegistryService,
    AgentRuntimeService,
    AgentBuilderService,
    AgentsGateway,
  ],
  exports: [
    ManagedAgentStoreService,
    AgentConversationStoreService,
    AgentRegistryService,
    AgentRuntimeService,
    AgentBuilderService,
  ],
})
export class AgentsModule {}
