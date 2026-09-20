import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AgentsModule } from './agents/agents.module';
import { HealthModule } from './health/health.module';
import { LlmModule } from './llm/llm.module';
import { AgentQueueModule } from './queue/agent-queue.module';
import { RedisModule } from './state/redis.module';

@Module({
  imports: [
    // Configuración global para que todos los módulos puedan leer .env.
    ConfigModule.forRoot({ isGlobal: true }),

    // Redis conserva estado entre solicitudes independientes.
    RedisModule,

    // Adapter para comunicarnos con el modelo de lenguaje.
    LlmModule,

    // Registro, orquestación y ejecución de agentes.
    AgentsModule,

    // BullMQ permite sacar tareas largas fuera del ciclo HTTP.
    AgentQueueModule,

    // Endpoint de salud para diagnóstico.
    HealthModule,
  ],
})
export class AppModule {}
