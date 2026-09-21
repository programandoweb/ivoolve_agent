import type { UserRole } from '../auth/auth.types';

export interface ToolExecutionContext {
  agentId: string;
  source: 'interactive' | 'provider' | 'delegation';
  actorRole?: UserRole;
  actorId?: string;
  tenantId?: string;
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
