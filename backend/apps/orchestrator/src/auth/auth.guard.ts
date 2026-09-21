import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Autenticación requerida.');
    }

    const token = authorization.slice('Bearer '.length).trim();
    const user = await this.auth.verifyToken(token);

    // Dejamos el usuario disponible para controladores protegidos.
    (request as Request & { user?: typeof user }).user = user;

    return true;
  }
}
