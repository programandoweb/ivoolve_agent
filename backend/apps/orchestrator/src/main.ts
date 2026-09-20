// reflect-metadata habilita los decoradores usados internamente por NestJS.
import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // NestFactory crea el proceso HTTP que permanecerá escuchando peticiones.
  const app = await NestFactory.create(AppModule);

  // ValidationPipe transforma y valida los DTO antes de entrar al runtime.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 5020 es el puerto estándar de desarrollo del backend.
  // PORT puede sobrescribirlo cuando otro entorno necesite un valor diferente.
  const port = Number(process.env.PORT ?? 5020);

  // Desde este punto NestJS queda vivo esperando nuevas peticiones.
  await app.listen(port);

  console.log(`Ivoolve Agent escuchando en http://localhost:${port}`);
}

void bootstrap();
