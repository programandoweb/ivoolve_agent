import type { UserRole } from '../auth/auth.types';

export interface ToolExecutionContext {
  agentId: string;
  source: 'interactive' | 'provider' | 'delegation' | 'integration';
  actorRole?: UserRole;
  actorId?: string;
  tenantId?: string;
  executionId?: string;
  correlationId?: string;
  campaignId?: string;
  campaignContext?: Record<string, unknown>;
}

export interface RuntimeToolDefinition {
  name: string;
  description: string;
  arguments: Record<string, string>;
}

export interface ToolCallEnvelope {
  tool: string;
  arguments?: Record<string, unknown>;
}
