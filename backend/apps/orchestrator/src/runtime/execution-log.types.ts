export type ExecutionStatus =
  | 'received'
  | 'processing'
  | 'completed'
  | 'ignored'
  | 'failed';

export interface RuntimeExecutionRecord {
  id: string;
  tenantId?: string;
  providerId?: string;
  conversationId?: string;
  externalMessageId?: string;
  agentId?: string;
  source?: string;
  correlationId?: string;
  campaignId?: string;
  currentStage?: string;
  status: ExecutionStatus;
  inputPreview?: string;
  outputPreview?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface RuntimeExecutionEvent {
  id: number;
  executionId: string;
  tenantId?: string;
  level: string;
  stage: string;
  message: string;
  data?: unknown;
  createdAt: string;
}
