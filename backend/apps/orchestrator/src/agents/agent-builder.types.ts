export type AgentExecutionMode = 'reactive' | 'scheduled' | 'event' | 'worker';

export interface AgentDraft {
  name: string;
  slug: string;
  role: string;
  description: string;
  personality: string;
  communicationStyle: string;
  primaryGoal: string;
  responsibilities: string[];
  exclusions: string[];
  skills: string[];
  tools: string[];
  memoryEnabled: boolean;
  stableKnowledge: string[];
  runtimeMemory: boolean;
  durableMemory: boolean;
  executionMode: AgentExecutionMode | '';
  canDelegate: boolean;
  supervisor: string;
  expectedOutput: string;
  completionCriteria: string[];
  requiresApproval: string[];
  forbiddenActions: string[];
}

export interface AgentBuilderState {
  sessionId: string;
  status: 'interviewing' | 'ready' | 'published';
  draft: AgentDraft;
  missing: string[];
  updatedAt: string;
  publishedAgentId?: string;
}

export interface ManagedAgentRecord {
  version: 1;
  createdAt: string;
  updatedAt: string;
  definition: AgentDraft;
}
