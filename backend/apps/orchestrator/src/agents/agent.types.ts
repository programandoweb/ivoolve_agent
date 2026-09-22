import type { UserRole } from '../auth/auth.types';

export type AgentSource = 'core' | 'managed';

export interface AgentMetadata {
  name?: string;
  role?: string;
  primaryGoal?: string;
  skills?: string[];
  executionMode?: string;
}

export interface AgentDefinition {
  id: string;
  prompt: string;
  memory: string;
  tools: string;
  skills?: string;
  source: AgentSource;
  metadata?: AgentMetadata;
}

export interface RuntimeTraceEvent {
  level?: 'debug' | 'info' | 'warning' | 'error';
  stage: string;
  message: string;
  data?: unknown;
  createdAt?: string;
}

export interface RuntimeInvocationContext {
  source: 'interactive' | 'provider' | 'delegation' | 'integration';
  actorRole?: UserRole;
  actorId?: string;
  tenantId?: string;
  executionId?: string;
  correlationId?: string;
  campaignId?: string;
  traceReporter?: (event: RuntimeTraceEvent) => Promise<void>;
}
