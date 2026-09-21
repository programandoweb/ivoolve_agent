import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';

import { AuthenticatedUser, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
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

    const payload: JwtPayload = {
      sub: configuredUsername,
      role: 'admin',
    };

    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        username: configuredUsername,
        role: 'admin',
      } satisfies AuthenticatedUser,
    };
  }

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);

      if (payload.role !== 'admin' || !payload.sub) {
        throw new UnauthorizedException('Sesión inválida.');
      }

      return {
        username: payload.sub,
        role: 'admin',
      };
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }
  }
}
