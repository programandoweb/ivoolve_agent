import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // BullMQ usa Redis, pero mantiene una conexión orientada específicamente a colas.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          // ioredis/BullMQ aceptan host y puerto; extraemos ambos desde REDIS_URL.
          host: new URL(
            config.get<string>('REDIS_URL', 'redis://localhost:6379'),
          ).hostname,
          port: Number(
            new URL(
              config.get<string>('REDIS_URL', 'redis://localhost:6379'),
            ).port || 6379,
          ),
        },
      }),
    }),

    // Esta cola queda lista para trabajos largos de agentes.
    BullModule.registerQueue({
      name: 'agent-jobs',
    }),
  ],
  exports: [BullModule],
})
export class AgentQueueModule {}
