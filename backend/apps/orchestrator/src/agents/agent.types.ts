export type AgentSource = 'core' | 'managed';

export interface AgentMetadata {
  name?: string;
  role?: string;
  primaryGoal?: string;
  skills?: string[];
  executionMode?: string;
}

// Representación uniforme de cualquier agente cargado por el runtime.
// Los agentes core nacen de Markdown; los gestionados nacen del Agent Builder.
export interface AgentDefinition {
  id: string;
  prompt: string;
  memory: string;
  tools: string;
  source: AgentSource;
  metadata?: AgentMetadata;
}
