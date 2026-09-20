import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

import { AgentDefinition } from './agent.types';

@Injectable()
export class AgentRegistryService implements OnModuleInit {
  // Este Map es como una guía telefónica de agentes disponibles.
  private readonly agents = new Map<string, AgentDefinition>();

  private readonly logger = new Logger(AgentRegistryService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    // NestJS ejecuta esto al iniciar: descubrimos agentes sin hardcodearlos.
    await this.reload();
  }

  async reload(): Promise<void> {
    this.agents.clear();

    const agentsPath = resolve(
      process.cwd(),
      this.config.get<string>('AGENTS_PATH', 'agents'),
    );

    const entries = await fs.readdir(agentsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const id = entry.name.toLowerCase();
      const directory = join(agentsPath, entry.name);

      // Los tres Markdown forman la definición declarativa del agente.
      const [prompt, memory, tools] = await Promise.all([
        fs.readFile(join(directory, 'Agent.md'), 'utf8'),
        fs.readFile(join(directory, 'Memory.md'), 'utf8'),
        fs.readFile(join(directory, 'Tools.md'), 'utf8'),
      ]);

      this.agents.set(id, { id, prompt, memory, tools });
    }

    this.logger.log(
      `Agentes descubiertos: ${this.list().map((agent) => agent.id).join(', ')}`,
    );
  }

  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id.toLowerCase());
  }

  list(): AgentDefinition[] {
    return [...this.agents.values()];
  }
}
