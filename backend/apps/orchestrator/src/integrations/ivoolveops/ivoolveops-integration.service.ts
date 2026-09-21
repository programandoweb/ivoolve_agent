import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';

import { AgentRegistryService } from '../../agents/agent-registry.service';
import { ManagedAgentStoreService } from '../../agents/managed-agent-store.service';
import type { AgentDraft } from '../../agents/agent-builder.types';
import { AuthService } from '../../auth/auth.service';
import { DatabaseService } from '../../database/database.service';
import type {
  IvoolveOpsAgentLink,
  IvoolveOpsProvisionPayload,
} from './ivoolveops-integration.types';

interface LinkRow extends RowDataPacket {
  agent_id: string;
  external_customer_id: string;
  external_project_id: string;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

interface TicketRow extends RowDataPacket {
  id: string;
  agent_id: string;
  expires_at: Date;
  used_at: Date | null;
}

@Injectable()
export class IvoolveOpsIntegrationService {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
    private readonly managedAgents: ManagedAgentStoreService,
    private readonly registry: AgentRegistryService,
    private readonly auth: AuthService,
  ) {}

  assertServiceToken(authorization?: string): void {
    const expected = this.config.get<string>('IVOOLVEOPS_SERVICE_TOKEN');
    if (!expected) {
      throw new ServiceUnavailableException(
        'IVOOLVEOPS_SERVICE_TOKEN no está configurado.',
      );
    }
    if (authorization !== `Bearer ${expected}`) {
      throw new UnauthorizedException('Service token inválido.');
    }
  }

  async provision(
    payload: IvoolveOpsProvisionPayload,
    idempotencyKey: string,
    correlationId?: string,
  ) {
    this.requireDatabase();
    if (!idempotencyKey?.trim()) {
      throw new ConflictException('Idempotency-Key es obligatorio.');
    }

    const existing = await this.findLink(payload.external_project_id);
    if (existing) {
      return {
        customer_id: existing.externalCustomerId,
        agent_id: existing.agentId,
        status: existing.status,
        idempotent: true,
      };
    }

    const now = new Date();
    await this.database.execute(
      `INSERT INTO integration_contexts
        (id, external_source, external_customer_id, external_project_id,
         customer_json, project_json, created_at, updated_at)
       VALUES (?, 'ivoolveops', ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         external_customer_id=VALUES(external_customer_id),
         customer_json=VALUES(customer_json),
         project_json=VALUES(project_json),
         updated_at=VALUES(updated_at)`,
      [
        crypto.randomUUID(),
        payload.external_customer_id,
        payload.external_project_id,
        JSON.stringify(payload.customer),
        JSON.stringify(payload.project),
        now,
        now,
      ],
    );

    const agentId = this.agentIdFor(payload.external_project_id);
    if (!(await this.managedAgents.exists(agentId))) {
      await this.managedAgents.create(this.toDraft(agentId, payload));
      await this.registry.reload();
    }

    await this.database.execute(
      `INSERT INTO integration_agent_links
        (id, external_source, external_customer_id, external_project_id,
         role, agent_id, idempotency_key, status, created_at, updated_at)
       VALUES (?, 'ivoolveops', ?, ?, 'customer_support', ?, ?, 'active', ?, ?)`,
      [
        crypto.randomUUID(),
        payload.external_customer_id,
        payload.external_project_id,
        agentId,
        idempotencyKey,
        now,
        now,
      ],
    );

    await this.audit(
      'integration.ivoolveops.agent_provisioned',
      agentId,
      {
        externalProjectId: payload.external_project_id,
        externalCustomerId: payload.external_customer_id,
        correlationId,
      },
    );

    return {
      customer_id: payload.external_customer_id,
      agent_id: agentId,
      status: 'active',
      idempotent: false,
    };
  }

  async status(externalProjectId: string) {
    this.requireDatabase();
    const link = await this.findLink(externalProjectId);
    if (!link) throw new NotFoundException('Integración de agente no encontrada.');

    return {
      customer_id: link.externalCustomerId,
      agent_id: link.agentId,
      status: link.status,
      updated_at: link.updatedAt,
      active: Boolean(this.registry.get(link.agentId)),
    };
  }

  async createSsoTicket(
    agentId: string,
    externalUserId: string,
    correlationId?: string,
  ) {
    this.requireDatabase();
    if (!this.registry.get(agentId)) {
      throw new NotFoundException('Agente no encontrado.');
    }

    const rawTicket = randomBytes(32).toString('base64url');
    const ticketHash = this.hash(rawTicket);
    const ttlSeconds = Number(
      this.config.get<string>('SSO_TICKET_TTL_SECONDS', '60'),
    );
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    await this.database.execute(
      `INSERT INTO sso_tickets
        (id, ticket_hash, agent_id, external_user_id, expires_at, used_at, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
      [
        crypto.randomUUID(),
        ticketHash,
        agentId,
        externalUserId,
        expiresAt,
        now,
      ],
    );

    await this.audit('integration.ivoolveops.sso_ticket_created', agentId, {
      externalUserId,
      correlationId,
      expiresAt: expiresAt.toISOString(),
    });

    const publicAppUrl = (
      this.config.get<string>('PUBLIC_APP_URL') ?? 'http://localhost:5021'
    ).replace(/\/$/, '');

    return {
      url: `${publicAppUrl}/api/sso/ivoolveops?ticket=${encodeURIComponent(rawTicket)}`,
      expires_at: expiresAt.toISOString(),
    };
  }

  async consumeSsoTicket(rawTicket: string) {
    this.requireDatabase();
    const rows = await this.database.query<TicketRow[]>(
      `SELECT id, agent_id, expires_at, used_at
         FROM sso_tickets
        WHERE ticket_hash = ?
        LIMIT 1`,
      [this.hash(rawTicket)],
    );
    const ticket = rows[0];
    if (!ticket || ticket.used_at || ticket.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('Ticket SSO inválido, expirado o ya utilizado.');
    }

    const result = await this.database.execute(
      `UPDATE sso_tickets
          SET used_at = ?
        WHERE id = ? AND used_at IS NULL AND expires_at > ?`,
      [new Date(), ticket.id, new Date()],
    );
    if (result.affectedRows !== 1) {
      throw new UnauthorizedException('Ticket SSO ya utilizado.');
    }

    const session = await this.auth.issueIntegrationSession();
    await this.audit('integration.ivoolveops.sso_ticket_consumed', ticket.agent_id, {
      ticketId: ticket.id,
    });

    return {
      ...session,
      agentId: ticket.agent_id,
    };
  }

  private async findLink(externalProjectId: string): Promise<IvoolveOpsAgentLink | undefined> {
    const rows = await this.database.query<LinkRow[]>(
      `SELECT agent_id, external_customer_id, external_project_id, status, created_at, updated_at
         FROM integration_agent_links
        WHERE external_source = 'ivoolveops'
          AND external_project_id = ?
          AND role = 'customer_support'
        LIMIT 1`,
      [externalProjectId],
    );
    const row = rows[0];
    if (!row) return undefined;
    return {
      agentId: row.agent_id,
      externalCustomerId: row.external_customer_id,
      externalProjectId: row.external_project_id,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private toDraft(
    agentId: string,
    payload: IvoolveOpsProvisionPayload,
  ): AgentDraft {
    const customer = payload.customer;
    const project = payload.project;
    return {
      name: payload.agent?.name?.trim() || `Soporte · ${customer.name}`,
      slug: agentId,
      role: 'customer_support',
      description:
        `Agente de soporte asignado a ${customer.name} para el proyecto ${project.name}.`,
      personality: 'Profesional, paciente, preciso y orientado a resolver.',
      communicationStyle: 'Claro, breve y basado únicamente en información verificada.',
      primaryGoal:
        'Conocer progresivamente al cliente y ayudar con sus sistemas, procesos, infraestructura, incidencias y necesidades sin inventar información.',
      responsibilities: [
        'Atender solicitudes de soporte del cliente.',
        'Aprender información operativa confirmada y mantenerla aislada por cliente/proyecto.',
        'Identificar incidencias, necesidades y contexto útil para futuros turnos.',
      ],
      exclusions: [
        'No inventar datos faltantes.',
        'No mezclar conocimiento con otros clientes o proyectos.',
        'No ejecutar cambios de infraestructura sin el flujo de aprobación correspondiente.',
      ],
      skills: ['customer-support', 'knowledge-capture'],
      tools: [],
      memoryEnabled: true,
      stableKnowledge: [
        `external_source: ivoolveops`,
        `external_customer_id: ${payload.external_customer_id}`,
        `external_project_id: ${payload.external_project_id}`,
        `Cliente: ${customer.name}`,
        `Proyecto: ${project.name}`,
        ...(project.domain ? [`Dominio: ${project.domain}`] : []),
        ...(customer.contact_name ? [`Contacto: ${customer.contact_name}`] : []),
        ...(customer.email ? [`Email: ${customer.email}`] : []),
        ...(customer.whatsapp ? [`WhatsApp: ${customer.whatsapp}`] : []),
      ],
      runtimeMemory: true,
      durableMemory: true,
      executionMode: 'reactive',
      canDelegate: false,
      supervisor: 'jorge',
      expectedOutput: 'Respuesta de soporte contextual, trazable y sin suposiciones.',
      completionCriteria: [
        'La solicitud quedó respondida o escalada.',
        'Los hechos nuevos confirmados quedaron diferenciados de las inferencias.',
      ],
      requiresApproval: ['Cambios mutantes de infraestructura'],
      forbiddenActions: [
        'Inventar datos del cliente.',
        'Usar conocimiento de otro cliente.',
        'Exponer secretos o credenciales.',
      ],
    };
  }

  private agentIdFor(externalProjectId: string): string {
    const normalized = externalProjectId
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return `ivoolveops-${normalized || this.hash(externalProjectId).slice(0, 16)}-support`;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private requireDatabase(): void {
    if (!this.database.enabled) {
      throw new ServiceUnavailableException(
        'La integración IvoolveOps requiere DATABASE_URL.',
      );
    }
  }

  private async audit(
    eventName: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.database.execute(
      `INSERT INTO audit_events
        (tenant_id, actor, event_name, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, 'ivoolveops', ?, 'agent', ?, ?, ?)`,
      [
        this.config.get<string>('DEFAULT_TENANT_ID', 'default'),
        eventName,
        entityId,
        JSON.stringify(metadata),
        new Date(),
      ],
    );
  }
}
