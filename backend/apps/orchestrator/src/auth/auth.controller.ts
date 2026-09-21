import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Request } from 'express';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';

class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username.trim(), dto.password);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(
    @Req()
    request: Request & {
      user?: AuthenticatedUser;
    },
  ) {
    return {
      user: request.user,
    };
  }
}
