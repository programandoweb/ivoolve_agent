import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from '../database/database.service';
import { AgentDefinition } from './agent.types';
import { AgentDraft, ManagedAgentRecord } from './agent-builder.types';

interface ManagedAgentRow extends RowDataPacket {
  id: string;
  definition_json: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ManagedAgentStoreService {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  async list(): Promise<AgentDefinition[]> {
    if (this.database.enabled) {
      const rows = await this.database.query<ManagedAgentRow[]>(
        'SELECT id, definition_json, created_at, updated_at FROM managed_agents ORDER BY created_at ASC',
      );

      return rows.map((row) =>
        this.toRuntimeDefinition(
          JSON.parse(row.definition_json) as AgentDraft,
        ),
      );
    }

    const directory = this.getDirectory();
    await fs.mkdir(directory, { recursive: true });

    const entries = await fs.readdir(directory, { withFileTypes: true });
    const definitions: AgentDefinition[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;

      const raw = await fs.readFile(join(directory, entry.name), 'utf8');
      const record = JSON.parse(raw) as ManagedAgentRecord;
      definitions.push(this.toRuntimeDefinition(record.definition));
    }

    return definitions;
  }

  async exists(slug: string): Promise<boolean> {
    if (this.database.enabled) {
      const rows = await this.database.query<RowDataPacket[]>(
        'SELECT id FROM managed_agents WHERE id = ? LIMIT 1',
        [slug],
      );
      return rows.length > 0;
    }

    try {
      await fs.access(this.getFilePath(slug));
      return true;
    } catch {
      return false;
    }
  }

  async create(draft: AgentDraft): Promise<AgentDefinition> {
    if (await this.exists(draft.slug)) {
      throw new ConflictException(
        `Ya existe un agente con id "${draft.slug}".`,
      );
    }

    const now = new Date();
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID', 'default');

    if (this.database.enabled) {
      await this.database.execute(
        `INSERT INTO managed_agents
          (id, tenant_id, definition_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [draft.slug, tenantId, JSON.stringify(draft), now, now],
      );

      return this.toRuntimeDefinition(draft);
    }

    const directory = this.getDirectory();
    await fs.mkdir(directory, { recursive: true });

    const record: ManagedAgentRecord = {
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      definition: draft,
    };

    const finalPath = this.getFilePath(draft.slug);
    const temporaryPath = `${finalPath}.tmp`;
    await fs.writeFile(
      temporaryPath,
      JSON.stringify(record, null, 2),
      'utf8',
    );
    await fs.rename(temporaryPath, finalPath);

    return this.toRuntimeDefinition(draft);
  }

  private toRuntimeDefinition(draft: AgentDraft): AgentDefinition {
    const prompt = [
      `# ${draft.name} — ${draft.role}`,
      '',
      '## Identidad',
      draft.description,
      '',
      `Personalidad: ${draft.personality}`,
      `Estilo de comunicación: ${draft.communicationStyle}`,
      '',
      '## Objetivo principal',
      draft.primaryGoal,
      '',
      '## Responsabilidades',
      ...draft.responsibilities.map((item) => `- ${item}`),
      '',
      '## Fuera de alcance',
      ...(draft.exclusions.length
        ? draft.exclusions.map((item) => `- ${item}`)
        : ['- No definido.']),
      '',
      '## Resultado esperado',
      draft.expectedOutput,
      '',
      '## Criterios de finalización',
      ...draft.completionCriteria.map((item) => `- ${item}`),
      '',
      '## Reglas de aprobación',
      ...(draft.requiresApproval.length
        ? draft.requiresApproval.map(
            (item) => `- Requiere aprobación: ${item}`,
          )
        : [
            '- No hay acciones adicionales declaradas que requieran aprobación.',
          ]),
      '',
      '## Acciones prohibidas',
      ...(draft.forbiddenActions.length
        ? draft.forbiddenActions.map((item) => `- ${item}`)
        : [
            '- No ejecutar acciones fuera de las herramientas y permisos declarados.',
          ]),
      '',
      `Supervisor: ${draft.supervisor || 'jorge'}`,
      `Puede delegar: ${draft.canDelegate ? 'sí' : 'no'}`,
      `Modo de ejecución: ${draft.executionMode}`,
    ].join('\n');

    const memory = [
      '# Memoria base',
      `Memoria habilitada: ${draft.memoryEnabled ? 'sí' : 'no'}`,
      `Memoria runtime: ${draft.runtimeMemory ? 'sí' : 'no'}`,
      `Memoria durable: ${draft.durableMemory ? 'sí' : 'no'}`,
      '',
      '## Conocimiento estable',
      ...(draft.stableKnowledge.length
        ? draft.stableKnowledge.map((item) => `- ${item}`)
        : ['- Sin conocimiento estable inicial.']),
    ].join('\n');

    const skills = [
      '# Skills',
      ...(draft.skills.length
        ? draft.skills.map((item) => `- ${item}`)
        : ['- Ninguno declarado.']),
    ].join('\n');

    const tools = [
      '# Tools',
      ...(draft.tools.length
        ? draft.tools.map((item) => `- ${item}`)
        : ['- Ninguna declarada.']),
      '',
      'Una herramienta declarada aquí solo puede ejecutarse si existe un adapter real en el runtime.',
    ].join('\n');

    return {
      id: draft.slug,
      prompt,
      memory,
      tools,
      skills,
      source: 'managed',
      metadata: {
        name: draft.name,
        role: draft.role,
        primaryGoal: draft.primaryGoal,
        skills: draft.skills,
        executionMode: draft.executionMode,
      },
    };
  }

  private getDirectory(): string {
    return resolve(
      process.cwd(),
      this.config.get<string>(
        'AGENTS_MANAGED_PATH',
        'data/managed-agents',
      ),
    );
  }

  private getFilePath(slug: string): string {
    return join(this.getDirectory(), `${slug}.json`);
  }
}
