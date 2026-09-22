import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import type { ConversationMessage } from '../state/redis.service';

type SessionRow = {
  session_id: string;
  tenant_id: string | null;
  agent_id: string;
  actor_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type MessageRow = {
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
};

@Injectable()
export class AgentConversationStoreService {
  constructor(private readonly database: DatabaseService) {}

  async ensureSession(input: {
    sessionId: string;
    tenantId?: string;
    agentId: string;
    actorId?: string;
  }): Promise<void> {
    if (!this.database.enabled) return;

    const now = new Date();
    await this.database.execute(
      `INSERT INTO agent_chat_sessions
        (session_id, tenant_id, agent_id, actor_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tenant_id = VALUES(tenant_id),
         agent_id = VALUES(agent_id),
         actor_id = COALESCE(VALUES(actor_id), actor_id),
         updated_at = VALUES(updated_at)`,
      [
        input.sessionId,
        input.tenantId ?? null,
        input.agentId,
        input.actorId ?? null,
        now,
        now,
      ],
    );
  }

  async appendMessage(
    sessionId: string,
    message: ConversationMessage,
  ): Promise<void> {
    if (!this.database.enabled) return;

    await this.database.execute(
      `INSERT INTO agent_chat_messages
        (session_id, role, content, created_at)
       VALUES (?, ?, ?, ?)`,
      [sessionId, message.role, message.content, new Date(message.createdAt)],
    );

    await this.database.execute(
      `UPDATE agent_chat_sessions
       SET updated_at = ?
       WHERE session_id = ?`,
      [new Date(message.createdAt), sessionId],
    );
  }

  async loadSession(input: {
    sessionId: string;
    tenantId?: string;
    agentId?: string;
  }): Promise<{
    sessionId: string;
    activeAgent: string;
    messages: ConversationMessage[];
    updatedAt: string;
  } | null> {
    if (!this.database.enabled) return null;

    const params: Array<string | null> = [input.sessionId];
    let where = 'session_id = ?';

    if (input.tenantId) {
      where += ' AND tenant_id = ?';
      params.push(input.tenantId);
    }

    if (input.agentId) {
      where += ' AND agent_id = ?';
      params.push(input.agentId);
    }

    const sessions = (await this.database.query(
      `SELECT session_id, tenant_id, agent_id, actor_id, created_at, updated_at
       FROM agent_chat_sessions
       WHERE ${where}
       LIMIT 1`,
      params,
    )) as SessionRow[];
    const session = sessions[0];
    if (!session) return null;

    const rows = (await this.database.query(
      `SELECT role, content, created_at
       FROM agent_chat_messages
       WHERE session_id = ?
       ORDER BY id ASC
       LIMIT 500`,
      [input.sessionId],
    )) as MessageRow[];

    return {
      sessionId: session.session_id,
      activeAgent: session.agent_id,
      messages: rows.map((row) => ({
        role: row.role,
        content: row.content,
        createdAt: new Date(row.created_at).toISOString(),
      })),
      updatedAt: new Date(session.updated_at).toISOString(),
    };
  }
}
