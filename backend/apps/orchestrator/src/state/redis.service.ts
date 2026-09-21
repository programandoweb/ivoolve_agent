import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

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
    return this.getJson<AgentSession>(this.sessionKey(sessionId));
  }

  async saveSession(session: AgentSession): Promise<void> {
    const ttl = Number(this.config.get<string>('SESSION_TTL_SECONDS', '86400'));
    await this.setJson(this.sessionKey(session.sessionId), session, ttl);
  }

  // Helpers genéricos para estados temporales de dominio, como el Agent Builder.
  // Mantienen Redis desacoplado de la estructura concreta del borrador.
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private sessionKey(sessionId: string): string {
    return `ivoolve:session:${sessionId}`;
  }
}
