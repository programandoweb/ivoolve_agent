import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

import { AgentDefinition } from './agent.types';
import { ManagedAgentStoreService } from './managed-agent-store.service';

@Injectable()
export class AgentRegistryService implements OnModuleInit {
  // Guía telefónica unificada: agentes core + agentes creados desde el gestor.
  private readonly agents = new Map<string, AgentDefinition>();
  private readonly logger = new Logger(AgentRegistryService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly managedStore: ManagedAgentStoreService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.agents.clear();
    await this.loadCoreAgents();

    // Los agentes gestionados son durables, pero no se mezclan con los Markdown
    // de código fuente. Esto permite crearlos desde UI sin modificar Git.
    for (const agent of await this.managedStore.list()) {
      this.agents.set(agent.id, agent);
    }

    this.logger.log(
      `Agentes descubiertos: ${this.list().map((agent) => `${agent.id}[${agent.source}]`).join(', ')}`,
    );
  }

  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id.toLowerCase());
  }

  list(): AgentDefinition[] {
    return [...this.agents.values()];
  }

  private async loadCoreAgents(): Promise<void> {
    const agentsPath = resolve(
      process.cwd(),
      this.config.get<string>('AGENTS_PATH', 'agents'),
    );

    const entries = await fs.readdir(agentsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const id = entry.name.toLowerCase();
      const directory = join(agentsPath, entry.name);
      const [prompt, memory, tools, skills] = await Promise.all([
        fs.readFile(join(directory, 'Agent.md'), 'utf8'),
        fs.readFile(join(directory, 'Memory.md'), 'utf8'),
        fs.readFile(join(directory, 'Tools.md'), 'utf8'),
        fs.readFile(join(directory, 'Skills.md'), 'utf8').catch(() => ''),
      ]);

      this.agents.set(id, {
        id,
        prompt,
        memory,
        tools,
        ...(skills ? { skills } : {}),
        source: 'core',
        metadata: {
          name: entry.name,
          role: id === 'jorge' ? 'Orquestador principal' : 'Agente core',
        },
      });
    }
  }
}
