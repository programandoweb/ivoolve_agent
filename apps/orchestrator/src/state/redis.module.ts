import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        // Se crea una única conexión reutilizable para el runtime.
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');

        return new Redis(redisUrl, {
          // BullMQ necesita controlar sus propios reintentos.
          maxRetriesPerRequest: null,
        });
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
