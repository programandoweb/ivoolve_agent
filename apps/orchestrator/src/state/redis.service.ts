import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

// Un mensaje representa una intervención dentro de la conversación.
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// La sesión es el "estado" que sobrevive después de terminar una petición HTTP.
export interface AgentSession {
  sessionId: string;
  activeAgent: string;
  messages: ConversationMessage[];
  updatedAt: string;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async getSession(sessionId: string): Promise<AgentSession | null> {
    // Redis devuelve texto; nosotros guardamos el objeto serializado como JSON.
    const raw = await this.redis.get(this.sessionKey(sessionId));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AgentSession;
  }

  async saveSession(session: AgentSession): Promise<void> {
    // TTL evita que sesiones de laboratorio permanezcan para siempre.
    const ttl = Number(this.config.get<string>('SESSION_TTL_SECONDS', '86400'));

    await this.redis.setex(
      this.sessionKey(session.sessionId),
      ttl,
      JSON.stringify(session),
    );
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    // Al apagar NestJS cerramos la conexión limpiamente.
    await this.redis.quit();
  }

  private sessionKey(sessionId: string): string {
    return `ivoolve:session:${sessionId}`;
  }
}
