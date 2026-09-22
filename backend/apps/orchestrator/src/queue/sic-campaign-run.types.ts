export interface SicCampaignRunPayload {
  execution_id: string;
  correlation_id: string;
  campaign_id: string;
  agent_id: string;
  context: Record<string, unknown>;
}
