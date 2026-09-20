// Esta interfaz es la representación en memoria de una carpeta dentro de agents/.
export interface AgentDefinition {
  id: string;
  prompt: string;
  memory: string;
  tools: string;
}
