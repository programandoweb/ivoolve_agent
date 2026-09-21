export interface IvoolveOpsProvisionPayload {
  external_customer_id: string;
  external_project_id: string;
  customer: {
    name: string;
    contact_name?: string;
    email?: string;
    whatsapp?: string;
  };
  project: {
    name: string;
    domain?: string;
  };
  agent?: {
    name?: string;
    role?: 'customer_support';
  };
}

export interface IvoolveOpsAgentLink {
  agentId: string;
  externalCustomerId: string;
  externalProjectId: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}
