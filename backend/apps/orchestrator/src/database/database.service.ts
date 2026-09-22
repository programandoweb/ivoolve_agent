import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPool,
  type Pool,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise';

type SqlValue =
  | string
  | number
  | boolean
  | Date
  | Buffer
  | null
  | undefined;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool?: Pool;

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.config.get<string>('DATABASE_URL'));
  }

  async onModuleInit(): Promise<void> {
    const databaseUrl = this.config.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      this.logger.warn(
        'DATABASE_URL no configurado: se mantienen los stores locales de desarrollo.',
      );
      return;
    }

    this.pool = createPool({
      uri: databaseUrl,
      connectionLimit: Number(
        this.config.get<string>('DATABASE_POOL_SIZE', '10'),
      ),
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    await this.pool.query('SELECT 1');

    if (
      this.config.get<string>('DATABASE_AUTO_MIGRATE', 'true').toLowerCase() ===
      'true'
    ) {
      await this.migrate();
    }

    this.logger.log('MariaDB compartida conectada.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  async ping(): Promise<boolean> {
    if (!this.pool) return false;
    await this.pool.query('SELECT 1');
    return true;
  }

  async query<T extends RowDataPacket[] = RowDataPacket[]>(
    sql: string,
    params: SqlValue[] = [],
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('La persistencia compartida no está habilitada.');
    }

    const [rows] = await this.pool.query<T>(sql, params);
    return rows;
  }

  async execute(
    sql: string,
    params: SqlValue[] = [],
  ): Promise<ResultSetHeader> {
    if (!this.pool) {
      throw new Error('La persistencia compartida no está habilitada.');
    }

    const [result] = await this.pool.execute<ResultSetHeader>(
      sql,
      params as any,
    );
    return result;
  }

  private async migrate(): Promise<void> {
    if (!this.pool) return;

    const statements = [
      `CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(64) PRIMARY KEY,
        slug VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(160) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NULL,
        username VARCHAR(120) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(30) NOT NULL DEFAULT 'viewer',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX idx_users_tenant_role (tenant_id, role),
        CONSTRAINT fk_users_tenant
          FOREIGN KEY (tenant_id) REFERENCES tenants(id)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS managed_agents (
        id VARCHAR(120) PRIMARY KEY,
        tenant_id VARCHAR(64) NULL,
        definition_json LONGTEXT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX idx_managed_agents_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS providers (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NULL,
        record_json LONGTEXT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX idx_providers_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS runtime_executions (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NULL,
        provider_id VARCHAR(64) NULL,
        agent_id VARCHAR(120) NULL,
        source VARCHAR(60) NULL,
        correlation_id VARCHAR(120) NULL,
        campaign_id VARCHAR(120) NULL,
        current_stage VARCHAR(160) NULL,
        status VARCHAR(30) NOT NULL,
        record_json LONGTEXT NOT NULL,
        started_at DATETIME(3) NOT NULL,
        finished_at DATETIME(3) NULL,
        INDEX idx_runtime_status_started (status, started_at),
        INDEX idx_runtime_provider_started (provider_id, started_at),
        INDEX idx_runtime_agent_started (agent_id, started_at),
        INDEX idx_runtime_correlation (correlation_id),
        INDEX idx_runtime_campaign (campaign_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS runtime_execution_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        execution_id VARCHAR(64) NOT NULL,
        tenant_id VARCHAR(64) NULL,
        level VARCHAR(20) NOT NULL DEFAULT 'info',
        stage VARCHAR(160) NOT NULL,
        message TEXT NOT NULL,
        data_json LONGTEXT NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_runtime_events_execution (execution_id, id),
        INDEX idx_runtime_events_tenant_created (tenant_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `ALTER TABLE runtime_executions ADD COLUMN IF NOT EXISTS source VARCHAR(60) NULL AFTER agent_id`,
      `ALTER TABLE runtime_executions ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(120) NULL AFTER source`,
      `ALTER TABLE runtime_executions ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(120) NULL AFTER correlation_id`,
      `ALTER TABLE runtime_executions ADD COLUMN IF NOT EXISTS current_stage VARCHAR(160) NULL AFTER campaign_id`,
      `CREATE INDEX IF NOT EXISTS idx_runtime_correlation ON runtime_executions (correlation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_runtime_campaign ON runtime_executions (campaign_id)`,
      `CREATE TABLE IF NOT EXISTS approvals (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NULL,
        agent_id VARCHAR(120) NOT NULL,
        action_name VARCHAR(120) NOT NULL,
        payload_json LONGTEXT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        requested_by VARCHAR(120) NULL,
        decided_by VARCHAR(120) NULL,
        decision_note TEXT NULL,
        created_at DATETIME(3) NOT NULL,
        decided_at DATETIME(3) NULL,
        INDEX idx_approvals_status_created (status, created_at),
        INDEX idx_approvals_tenant_status (tenant_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS integration_contexts (
        id VARCHAR(64) PRIMARY KEY,
        external_source VARCHAR(60) NOT NULL,
        external_customer_id VARCHAR(190) NOT NULL,
        external_project_id VARCHAR(190) NOT NULL,
        customer_json LONGTEXT NOT NULL,
        project_json LONGTEXT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE KEY uq_integration_context_project (external_source, external_project_id),
        INDEX idx_integration_context_customer (external_source, external_customer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS integration_agent_links (
        id VARCHAR(64) PRIMARY KEY,
        external_source VARCHAR(60) NOT NULL,
        external_customer_id VARCHAR(190) NOT NULL,
        external_project_id VARCHAR(190) NOT NULL,
        role VARCHAR(80) NOT NULL,
        agent_id VARCHAR(120) NOT NULL,
        idempotency_key VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE KEY uq_integration_agent_role (external_source, external_project_id, role),
        UNIQUE KEY uq_integration_idempotency (external_source, idempotency_key),
        INDEX idx_integration_agent (agent_id),
        INDEX idx_integration_customer (external_source, external_customer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS sso_tickets (
        id VARCHAR(64) PRIMARY KEY,
        ticket_hash CHAR(64) NOT NULL UNIQUE,
        agent_id VARCHAR(120) NOT NULL,
        external_user_id VARCHAR(190) NOT NULL,
        expires_at DATETIME(3) NOT NULL,
        used_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_sso_ticket_expiry (expires_at, used_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS audit_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(64) NULL,
        actor VARCHAR(160) NULL,
        event_name VARCHAR(160) NOT NULL,
        entity_type VARCHAR(100) NULL,
        entity_id VARCHAR(160) NULL,
        metadata_json LONGTEXT NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_audit_created (created_at),
        INDEX idx_audit_tenant_event (tenant_id, event_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ];

    for (const statement of statements) {
      await this.pool.query(statement);
    }

    const now = new Date();
    await this.execute(
      `INSERT IGNORE INTO tenants
        (id, slug, name, status, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?)`,
      ['default', 'default', 'Ivoolve', now, now],
    );

    const username = this.config.get<string>('ADMIN_USERNAME');
    const passwordHash = this.config.get<string>('ADMIN_PASSWORD_HASH');

    if (username && passwordHash) {
      await this.execute(
        `INSERT IGNORE INTO users
          (id, tenant_id, username, password_hash, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?)`,
        ['bootstrap-admin', 'default', username, passwordHash, now, now],
      );
    }
  }
}
