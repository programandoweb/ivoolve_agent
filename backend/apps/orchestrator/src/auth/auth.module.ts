import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AdminController } from './admin.controller';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';
import { UsersService } from './users.service';

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
            expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '8h') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, AdminController],
  providers: [AuthService, AuthGuard, RolesGuard, UsersService],
  exports: [AuthService, AuthGuard, RolesGuard, UsersService],
})
export class AuthModule {}
