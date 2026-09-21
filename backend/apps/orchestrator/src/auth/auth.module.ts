import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error(
            'JWT_SECRET es obligatorio. Configúralo en backend/.env.',
          );
        }

        return {
          secret,
          signOptions: {
            // Nest acepta formatos como "8h". El cast evita perder esa
            // flexibilidad por la unión estricta de tipos de jsonwebtoken.
            expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '8h') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
