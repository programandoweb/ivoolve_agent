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
    const ttl = Number(
      this.config.get<string>('SESSION_TTL_SECONDS', '86400'),
    );
    await this.setJson(this.sessionKey(session.sessionId), session, ttl);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(
      key,
      '1',
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  async acquireLease(
    key: string,
    owner: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.redis.set(
      key,
      owner,
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  async renewLease(
    key: string,
    owner: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const script = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('EXPIRE', KEYS[1], ARGV[2])
      end
      return 0
    `;
    const result = await this.redis.eval(
      script,
      1,
      key,
      owner,
      String(ttlSeconds),
    );

    return Number(result) === 1;
  }

  async releaseLease(
    key: string,
    owner: string,
  ): Promise<boolean> {
    const script = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      end
      return 0
    `;
    const result = await this.redis.eval(script, 1, key, owner);
    return Number(result) === 1;
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
