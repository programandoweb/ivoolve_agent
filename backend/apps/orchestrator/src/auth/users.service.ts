import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from '../database/database.service';
import { DatabaseUserRow } from '../database/database.types';
import { UserRole } from './auth.types';

interface TenantRow extends RowDataPacket {
  id: string;
  slug: string;
  name: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface UserRow extends RowDataPacket, DatabaseUserRow {
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  async listUsers(tenantId: string) {
    this.requireDatabase();

    const rows = await this.database.query<UserRow[]>(
      `SELECT id, tenant_id, username, role, status, created_at, updated_at
         FROM users
        WHERE tenant_id = ?
        ORDER BY created_at ASC`,
      [tenantId],
    );

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      username: row.username,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createUser(input: {
    tenantId: string;
    username: string;
    password: string;
    role: UserRole;
  }) {
    this.requireDatabase();

    const existing = await this.database.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [input.username],
    );

    if (existing.length) {
      throw new ConflictException(
        `Ya existe el usuario "${input.username}".`,
      );
    }

    const tenant = await this.database.query<RowDataPacket[]>(
      'SELECT id FROM tenants WHERE id = ? AND status = ? LIMIT 1',
      [input.tenantId, 'active'],
    );

    if (!tenant.length) {
      throw new NotFoundException(
        `Tenant "${input.tenantId}" no encontrado o inactivo.`,
      );
    }

    const id = randomUUID();
    const now = new Date();
    const passwordHash = await bcrypt.hash(input.password, 12);

    await this.database.execute(
      `INSERT INTO users
        (id, tenant_id, username, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        id,
        input.tenantId,
        input.username,
        passwordHash,
        input.role,
        now,
        now,
      ],
    );

    return {
      id,
      tenantId: input.tenantId,
      username: input.username,
      role: input.role,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateUser(
    id: string,
    tenantId: string,
    input: {
      role?: UserRole;
      status?: 'active' | 'disabled';
      password?: string;
    },
  ) {
    this.requireDatabase();

    const rows = await this.database.query<UserRow[]>(
      `SELECT id, tenant_id, username, password_hash, role, status,
              created_at, updated_at
         FROM users
        WHERE id = ? AND tenant_id = ?
        LIMIT 1`,
      [id, tenantId],
    );

    const current = rows[0];
    if (!current) {
      throw new NotFoundException(`Usuario "${id}" no encontrado.`);
    }

    const role = input.role ?? current.role;
    const status = input.status ?? current.status;
    const passwordHash = input.password
      ? await bcrypt.hash(input.password, 12)
      : current.password_hash;
    const updatedAt = new Date();

    await this.database.execute(
      `UPDATE users
          SET role = ?, status = ?, password_hash = ?, updated_at = ?
        WHERE id = ? AND tenant_id = ?`,
      [role, status, passwordHash, updatedAt, id, tenantId],
    );

    return {
      id: current.id,
      tenantId: current.tenant_id,
      username: current.username,
      role,
      status,
      createdAt: current.created_at,
      updatedAt,
    };
  }

  async listTenants() {
    this.requireDatabase();

    const rows = await this.database.query<TenantRow[]>(
      `SELECT id, slug, name, status, created_at, updated_at
         FROM tenants
        ORDER BY created_at ASC`,
    );

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createTenant(name: string, slug: string) {
    this.requireDatabase();

    const normalizedSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!normalizedSlug) {
      throw new ConflictException('El slug del tenant es inválido.');
    }

    const existing = await this.database.query<RowDataPacket[]>(
      'SELECT id FROM tenants WHERE slug = ? LIMIT 1',
      [normalizedSlug],
    );

    if (existing.length) {
      throw new ConflictException(
        `Ya existe un tenant con slug "${normalizedSlug}".`,
      );
    }

    const id = randomUUID();
    const now = new Date();

    await this.database.execute(
      `INSERT INTO tenants
        (id, slug, name, status, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?)`,
      [id, normalizedSlug, name.trim(), now, now],
    );

    return {
      id,
      slug: normalizedSlug,
      name: name.trim(),
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    };
  }

  private requireDatabase(): void {
    if (!this.database.enabled) {
      throw new ServiceUnavailableException(
        'La gestión multiusuario requiere DATABASE_URL.',
      );
    }
  }
}
