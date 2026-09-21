import { AgentRegistryService } from '../agents/agent-registry.service';
import { AgentRuntimeService } from '../agents/agent-runtime.service';
import { LlmService } from '../llm/llm.service';
import { ProvidersService } from '../providers/providers.service';
import { RedisService } from '../state/redis.service';
import { ExecutionLogStore } from './execution-log.store';
import { ProviderRoutingService } from './provider-routing.service';

describe('ProviderRoutingService', () => {
  const providers = {
    get: jest.fn(),
    sendText: jest.fn(),
  };
  const agents = {
    get: jest.fn(),
  };
  const runtime = {
    chatAsAgent: jest.fn(),
  };
  const llm = {
    complete: jest.fn(),
  };
  const redis = {
    claim: jest.fn(),
    delete: jest.fn(),
  };
  const executions = {
    append: jest.fn(),
  };

  let service: ProviderRoutingService;

  const message = {
    providerId: 'provider-1',
    providerType: 'whatsapp_baileys' as const,
    messageId: 'msg-1',
    sender: '573001112233@s.whatsapp.net',
    conversationId: '573001112233@s.whatsapp.net',
    text: 'Quiero conocer el precio',
    receivedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    redis.delete.mockResolvedValue(undefined);

    service = new ProviderRoutingService(
      providers as unknown as ProvidersService,
      agents as unknown as AgentRegistryService,
      runtime as unknown as AgentRuntimeService,
      llm as unknown as LlmService,
      redis as unknown as RedisService,
      executions as unknown as ExecutionLogStore,
    );
  });

  it('ejecuta el único agente autorizado dentro del tenant y responde por el provider', async () => {
    redis.claim.mockResolvedValue(true);
    providers.get.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-a',
      name: 'Ventas',
      agentIds: ['sales'],
    });
    agents.get.mockReturnValue({
      id: 'sales',
      source: 'managed',
      prompt: '',
      memory: '',
      tools: '',
    });
    runtime.chatAsAgent.mockResolvedValue({
      agent: 'sales',
      answer: 'El precio es...',
      sessionId: 'session',
      messageCount: 2,
    });
    providers.sendText.mockResolvedValue({ messageId: 'reply-1' });

    await service.handle(message);

    expect(runtime.chatAsAgent).toHaveBeenCalledWith(
      'tenant:tenant-a:provider:provider-1:contact:573001112233@s.whatsapp.net',
      message.text,
      'sales',
      {
        source: 'provider',
        tenantId: 'tenant-a',
      },
    );
    expect(providers.sendText).toHaveBeenCalledWith(
      'provider-1',
      'sales',
      message.sender,
      'El precio es...',
      'tenant-a',
    );
    expect(executions.append).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        status: 'completed',
        agentId: 'sales',
      }),
    );
    expect(redis.delete).not.toHaveBeenCalled();
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('ignora una reentrega del mismo mensaje cuando Redis no concede el claim', async () => {
    redis.claim.mockResolvedValue(false);

    await service.handle(message);

    expect(providers.get).not.toHaveBeenCalled();
    expect(runtime.chatAsAgent).not.toHaveBeenCalled();
    expect(providers.sendText).not.toHaveBeenCalled();
  });

  it('libera el claim cuando falla para permitir el retry de BullMQ', async () => {
    redis.claim.mockResolvedValue(true);
    providers.get.mockRejectedValue(new Error('provider temporalmente caído'));

    await expect(service.handle(message)).rejects.toThrow(
      'provider temporalmente caído',
    );

    expect(redis.delete).toHaveBeenCalledWith(
      'ivoolve:provider-message:provider-1:msg-1',
    );
    expect(executions.append).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
