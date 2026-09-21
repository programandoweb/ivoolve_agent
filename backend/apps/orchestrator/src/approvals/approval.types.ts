export type ApprovalStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'rejected';

export interface ApprovalRecord {
  id: string;
  tenantId: string;
  agentId: string;
  actionName: string;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  requestedBy?: string;
  decidedBy?: string;
  decisionNote?: string;
  createdAt: string;
  decidedAt?: string;
}
