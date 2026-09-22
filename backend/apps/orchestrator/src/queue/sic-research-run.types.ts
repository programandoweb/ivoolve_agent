export interface SicResearchRunPayload {
  researchId: string;
  prospectId: string;
  agentId: string;
  prospect: Record<string, unknown>;
  sources: Record<string, unknown>[];
  socialProfiles: Record<string, unknown>[];
}
