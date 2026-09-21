import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from '../database/database.service';
import { DatabaseUserRow } from '../database/database.types';
import { AuthenticatedUser, JwtPayload, UserRole } from './auth.types';

interface AuthUserRow extends RowDataPacket, DatabaseUserRow {}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly database: DatabaseService,
  ) {}

  async login(username: string, password: string) {
    if (this.database.enabled) {
      const rows = await this.database.query<AuthUserRow[]>(
        `SELECT id, tenant_id, username, password_hash, role, status
           FROM users
          WHERE username = ?
          LIMIT 1`,
        [username],
      );

      const user = rows[0];
      const passwordMatches = user
        ? await bcrypt.compare(password, user.password_hash)
        : false;

      if (
        !user ||
        user.status !== 'active' ||
        !passwordMatches ||
        !this.isRole(user.role)
      ) {
        throw new UnauthorizedException('Credenciales inválidas.');
      }

      return this.issueToken({
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId:
          user.tenant_id ??
          this.config.get<string>('DEFAULT_TENANT_ID', 'default'),
      });
    }

    const configuredUsername = this.config.get<string>('ADMIN_USERNAME');
    const passwordHash = this.config.get<string>('ADMIN_PASSWORD_HASH');

    if (!configuredUsername || !passwordHash) {
      throw new ServiceUnavailableException(
        'El administrador aún no está configurado.',
      );
    }

    const usernameMatches = username === configuredUsername;
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!usernameMatches || !passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return this.issueToken({
      id: 'bootstrap-admin',
      username: configuredUsername,
      role: 'admin',
      tenantId: this.config.get<string>('DEFAULT_TENANT_ID', 'default'),
    });
  }

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);

      if (
        !payload.sub ||
        !payload.username ||
        !payload.tenantId ||
        !this.isRole(payload.role)
      ) {
        throw new UnauthorizedException('Sesión inválida.');
      }

      if (this.database.enabled) {
        const rows = await this.database.query<AuthUserRow[]>(
          `SELECT id, tenant_id, username, password_hash, role, status
             FROM users
            WHERE id = ?
            LIMIT 1`,
          [payload.sub],
        );
        const current = rows[0];

        if (
          !current ||
          current.status !== 'active' ||
          current.role !== payload.role ||
          (current.tenant_id ?? 'default') !== payload.tenantId
        ) {
          throw new UnauthorizedException(
            'La cuenta cambió o fue deshabilitada.',
          );
        }
      }

      return {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
        tenantId: payload.tenantId,
      };
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }
  }

  async issueIntegrationSession() {
    if (this.database.enabled) {
      const rows = await this.database.query<AuthUserRow[]>(
        `SELECT id, tenant_id, username, password_hash, role, status
           FROM users
          WHERE status = 'active' AND role = 'admin'
          ORDER BY created_at ASC
          LIMIT 1`,
      );
      const user = rows[0];
      if (!user) {
        throw new ServiceUnavailableException(
          'No existe un administrador activo para completar el SSO.',
        );
      }

      return this.issueToken({
        id: user.id,
        username: user.username,
        role: 'admin',
        tenantId:
          user.tenant_id ??
          this.config.get<string>('DEFAULT_TENANT_ID', 'default'),
      });
    }

    const username = this.config.get<string>('ADMIN_USERNAME');
    if (!username) {
      throw new ServiceUnavailableException(
        'ADMIN_USERNAME no está configurado para completar el SSO.',
      );
    }

    return this.issueToken({
      id: 'bootstrap-admin',
      username,
      role: 'admin',
      tenantId: this.config.get<string>('DEFAULT_TENANT_ID', 'default'),
    });
  }

  private async issueToken(user: AuthenticatedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user,
    };
  }

  private isRole(role: string): role is UserRole {
    return role === 'admin' || role === 'operator' || role === 'viewer';
  }
}
