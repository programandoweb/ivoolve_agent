export interface ToolExecutionContext {
  agentId: string;
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
