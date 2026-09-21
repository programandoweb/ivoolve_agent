import { ConflictException, Injectable } from '@nestjs/common';

import { LlmService } from '../llm/llm.service';
import { RedisService } from '../state/redis.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentBuilderState, AgentDraft } from './agent-builder.types';
import { ManagedAgentStoreService } from './managed-agent-store.service';

const BUILDER_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class AgentBuilderService {
  constructor(
    private readonly redis: RedisService,
    private readonly llm: LlmService,
    private readonly store: ManagedAgentStoreService,
    private readonly registry: AgentRegistryService,
  ) {}

  async chat(sessionId: string, userMessage: string) {
    const key = this.key(sessionId);
    const previous =
      (await this.redis.getJson<AgentBuilderState>(key)) ??
      this.createInitialState(sessionId);

    // La publicación es deliberadamente explícita. Jorge nunca crea un agente
    // solo porque el borrador esté completo: el usuario debe confirmarlo.
    if (previous.status === 'ready' && this.isPublishCommand(userMessage)) {
      // Protegemos tanto agentes gestionados como agentes core (especialmente Jorge).
      // Un agente creado desde UI nunca puede sobrescribir un id ya registrado.
      if (this.registry.get(previous.draft.slug)) {
        throw new ConflictException(
          `Ya existe un agente registrado con id "${previous.draft.slug}". Cambia el nombre antes de publicar.`,
        );
      }

      const definition = await this.store.create(previous.draft);
      await this.registry.reload();

      const published: AgentBuilderState = {
        ...previous,
        status: 'published',
        publishedAgentId: definition.id,
        updatedAt: new Date().toISOString(),
      };

      await this.redis.setJson(key, published, BUILDER_TTL_SECONDS);

      return {
        sessionId,
        agent: 'jorge',
        answer:
          `Agente **${previous.draft.name}** creado correctamente con id \`${definition.id}\`. ` +
          'Ya quedó registrado y disponible para el runtime.',
        builder: published,
      };
    }

    if (previous.status === 'published') {
      return {
        sessionId,
        agent: 'jorge',
        answer:
          'Este flujo ya publicó el agente. Vuelve a “Crear agente” para iniciar una definición nueva.',
        builder: previous,
      };
    }

    const extracted = await this.extractDraft(previous.draft, userMessage);
    const draft = this.normalizeDraft({ ...previous.draft, ...extracted });
    const missing = this.validate(draft);
    const status: AgentBuilderState['status'] =
      missing.length === 0 ? 'ready' : 'interviewing';

    const state: AgentBuilderState = {
      sessionId,
      status,
      draft,
      missing,
      updatedAt: new Date().toISOString(),
    };

    await this.redis.setJson(key, state, BUILDER_TTL_SECONDS);

    return {
      sessionId,
      agent: 'jorge',
      answer:
        status === 'ready'
          ? this.buildReview(draft)
          : this.buildNextQuestion(draft, missing[0]),
      builder: state,
    };
  }

  private async extractDraft(
    current: AgentDraft,
    userMessage: string,
  ): Promise<Partial<AgentDraft>> {
    const system = `
Eres Jorge usando el skill agent-builder.
Convierte la respuesta del usuario en cambios estructurados para un borrador de agente.

REGLAS:
- Devuelve SOLAMENTE un objeto JSON válido, sin Markdown.
- No inventes datos que el usuario no haya dicho o que no sean inferibles con alta confianza.
- Conserva valores existentes cuando el usuario no los cambie.
- Para listas usa arrays de strings.
- executionMode solo puede ser: reactive, scheduled, event, worker o "".
- supervisor por defecto puede ser "jorge".
- Si el usuario describe una capacidad conceptual, agrégala a skills.
- tools solo contiene herramientas concretas (web, API, base de datos, WhatsApp, email, etc.).
- requiresApproval contiene acciones de impacto que el usuario quiera aprobar antes.
- forbiddenActions contiene límites explícitos.
- completionCriteria explica cómo saber objetivamente que el trabajo terminó.

Borrador actual:
${JSON.stringify(current)}
`.trim();

    const raw = await this.llm.complete([
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ]);

    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end === -1 || end < start) return {};

      return JSON.parse(raw.slice(start, end + 1)) as Partial<AgentDraft>;
    } catch {
      // Un fallo de estructuración del LLM no rompe la entrevista.
      // Jorge vuelve a preguntar por el primer criterio faltante.
      return {};
    }
  }

  private validate(draft: AgentDraft): string[] {
    const missing: string[] = [];

    if (!draft.name) missing.push('name');
    if (!draft.role) missing.push('role');
    if (!draft.primaryGoal) missing.push('primaryGoal');
    if (draft.responsibilities.length === 0) missing.push('responsibilities');
    if (!draft.personality) missing.push('personality');
    if (!draft.communicationStyle) missing.push('communicationStyle');
    if (draft.skills.length === 0) missing.push('skills');
    if (!draft.executionMode) missing.push('executionMode');
    if (!draft.expectedOutput) missing.push('expectedOutput');
    if (draft.completionCriteria.length === 0) missing.push('completionCriteria');

    return missing;
  }

  private buildNextQuestion(draft: AgentDraft, field: string): string {
    const questions: Record<string, string> = {
      name: 'Perfecto. ¿Qué nombre quieres darle a este agente?',
      role: '¿Cuál será exactamente su rol o especialidad?',
      primaryGoal: '¿Cuál es el resultado principal que debe conseguir este agente?',
      responsibilities:
        '¿Cuáles son sus responsabilidades principales? Puedes explicármelas de forma natural.',
      personality:
        '¿Qué personalidad debe tener al trabajar: técnica, comercial, analítica, cercana u otra?',
      communicationStyle:
        '¿Cómo quieres que se comunique y presente sus resultados?',
      skills:
        '¿Qué capacidades especializadas debe dominar? Yo las convertiré en skills reutilizables.',
      executionMode:
        '¿Cómo se ejecutará: al conversar (reactive), por horario (scheduled), por evento (event) o como worker?',
      expectedOutput:
        '¿Qué salida concreta esperas de cada ejecución: informe, leads, acciones, JSON, mensaje u otro resultado?',
      completionCriteria:
        '¿Cómo sabremos objetivamente que terminó bien una tarea? Dame uno o varios criterios de finalización.',
    };

    const progress = 10 - this.validate(draft).length;
    return `${questions[field] ?? 'Cuéntame un poco más sobre este agente.'}\n\nProgreso de definición: ${progress}/10 criterios mínimos.`;
  }

  private buildReview(draft: AgentDraft): string {
    return [
      `Ya tengo una definición completa para **${draft.name}**.`,
      '',
      `**Rol:** ${draft.role}`,
      `**Objetivo:** ${draft.primaryGoal}`,
      `**Skills:** ${draft.skills.join(', ')}`,
      `**Tools:** ${draft.tools.length ? draft.tools.join(', ') : 'ninguna concreta todavía'}`,
      `**Memoria:** ${draft.memoryEnabled ? 'habilitada' : 'deshabilitada'}`,
      `**Ejecución:** ${draft.executionMode}`,
      `**Supervisor:** ${draft.supervisor || 'jorge'}`,
      '',
      '**Criterios de finalización:**',
      ...draft.completionCriteria.map((item) => `- ${item}`),
      '',
      draft.requiresApproval.length
        ? `**Requiere aprobación para:** ${draft.requiresApproval.join(', ')}`
        : '**Aprobaciones especiales:** ninguna declarada.',
      '',
      'Si estás de acuerdo, escribe **crear agente**. Si quieres cambiar algo, indícamelo normalmente y actualizaré el borrador.',
    ].join('\n');
  }

  private normalizeDraft(draft: AgentDraft): AgentDraft {
    const name = String(draft.name ?? '').trim();

    return {
      ...this.createEmptyDraft(),
      ...draft,
      name,
      slug: name ? this.slugify(draft.slug || name) : '',
      supervisor: String(draft.supervisor || 'jorge').trim().toLowerCase(),
      responsibilities: this.cleanList(draft.responsibilities),
      exclusions: this.cleanList(draft.exclusions),
      skills: this.cleanList(draft.skills),
      tools: this.cleanList(draft.tools),
      stableKnowledge: this.cleanList(draft.stableKnowledge),
      completionCriteria: this.cleanList(draft.completionCriteria),
      requiresApproval: this.cleanList(draft.requiresApproval),
      forbiddenActions: this.cleanList(draft.forbiddenActions),
    };
  }

  private cleanList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  }

  private slugify(value: string): string {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }

  private isPublishCommand(message: string): boolean {
    return /^(crear agente|confirmar|publicar|si crear|sí crear)[.! ]*$/i.test(
      message.trim(),
    );
  }

  private createInitialState(sessionId: string): AgentBuilderState {
    return {
      sessionId,
      status: 'interviewing',
      draft: this.createEmptyDraft(),
      missing: ['name'],
      updatedAt: new Date().toISOString(),
    };
  }

  private createEmptyDraft(): AgentDraft {
    return {
      name: '',
      slug: '',
      role: '',
      description: '',
      personality: '',
      communicationStyle: '',
      primaryGoal: '',
      responsibilities: [],
      exclusions: [],
      skills: [],
      tools: [],
      memoryEnabled: true,
      stableKnowledge: [],
      runtimeMemory: true,
      durableMemory: true,
      executionMode: '',
      canDelegate: false,
      supervisor: 'jorge',
      expectedOutput: '',
      completionCriteria: [],
      requiresApproval: [],
      forbiddenActions: [],
    };
  }

  private key(sessionId: string): string {
    return `ivoolve:agent-builder:${sessionId}`;
  }
}
