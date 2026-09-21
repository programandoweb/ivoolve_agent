export type ExecutionStatus =
  | 'received'
  | 'processing'
  | 'completed'
  | 'ignored'
  | 'failed';

export interface RuntimeExecutionRecord {
  id: string;
  providerId?: string;
  conversationId?: string;
  externalMessageId?: string;
  agentId?: string;
  status: ExecutionStatus;
  inputPreview?: string;
  outputPreview?: string;
  error?: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}
