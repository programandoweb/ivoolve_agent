import { LlmService } from '../llm/llm.service';
import { RedisService } from '../state/redis.service';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentRuntimeService } from './agent-runtime.service';

describe('AgentRuntimeService delegation', () => {
  const registry = {
    get: jest.fn(),
    list: jest.fn(),
  };
  const redis = {
    getSession: jest.fn(),
    saveSession: jest.fn(),
  };
  const llm = {
    complete: jest.fn(),
  };
  const tools = {
    prompt: jest.fn(),
    parse: jest.fn(),
    execute: jest.fn(),
  };

  let service: AgentRuntimeService;

  const jorge = {
    id: 'jorge',
    prompt: 'Orquestador',
    memory: '',
    tools: '',
    source: 'core' as const,
    metadata: { role: 'Orquestador principal' },
  };

  const sales = {
    id: 'sales',
    prompt: 'Ventas',
    memory: '',
    tools: '',
    source: 'managed' as const,
    metadata: {
      role: 'Agente comercial',
      primaryGoal: 'Atender prospectos',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    registry.get.mockImplementation((id: string) => {
      if (id === 'jorge') return jorge;
      if (id === 'sales') return sales;
      return undefined;
    });
    registry.list.mockReturnValue([jorge, sales]);
    redis.getSession.mockResolvedValue(null);
    redis.saveSession.mockResolvedValue(undefined);
    tools.prompt.mockReturnValue('');
    tools.parse.mockReturnValue(null);

    service = new AgentRuntimeService(
      registry as unknown as AgentRegistryService,
      redis as unknown as RedisService,
      llm as unknown as LlmService,
      tools as unknown as ToolRegistryService,
    );
  });

  it('Jorge delega a un subagente y devuelve la respuesta final del subagente', async () => {
    llm.complete
      .mockResolvedValueOnce(
        '{"delegate":"sales","message":"Atiende esta consulta comercial"}',
      )
      .mockResolvedValueOnce('Claro, te ayudo con la cotización.');

    const result = await service.chatAsAgent(
      'chat-1',
      'Quiero comprar',
      'jorge',
    );

    expect(result.agent).toBe('jorge');
    expect(result.answer).toBe('Claro, te ayudo con la cotización.');
    expect(redis.saveSession).toHaveBeenCalledTimes(2);

    const delegatedSave = redis.saveSession.mock.calls[0][0];
    expect(delegatedSave.sessionId).toBe('chat-1:delegate:sales');
    expect(delegatedSave.activeAgent).toBe('sales');

    const parentSave = redis.saveSession.mock.calls[1][0];
    expect(parentSave.sessionId).toBe('chat-1');
    expect(parentSave.activeAgent).toBe('jorge');
  });
});
