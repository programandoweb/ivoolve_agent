import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WAMessage,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';

import { RedisService } from '../state/redis.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import {
  NormalizedProviderMessage,
  ProviderMessageHandler,
} from './provider-message.types';
import {
  ProviderConnectionView,
  ProviderRecord,
} from './provider.types';
import { ProviderStoreService } from './provider-store.service';

type RuntimeConnection = {
  socket: ReturnType<typeof makeWASocket>;
  qr?: string;
  manualClose: boolean;
};

@Injectable()
export class ProvidersService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ProvidersService.name);
  private readonly runtime = new Map<string, RuntimeConnection>();
  private readonly reconnectTimers = new Map<string, NodeJS.Timeout>();
  private readonly leaseTimers = new Map<string, NodeJS.Timeout>();
  private readonly messageHandlers = new Set<ProviderMessageHandler>();
  private readonly instanceId: string;
  private readonly leaseTtlSeconds: number;

  constructor(
    private readonly store: ProviderStoreService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.instanceId =
      this.config.get<string>('RUNTIME_INSTANCE_ID') ??
      `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
    this.leaseTtlSeconds = Math.max(
      15,
      Number(
        this.config.get<string>(
          'PROVIDER_LEASE_TTL_SECONDS',
          '45',
        ),
      ),
    );
  }

  async onModuleInit(): Promise<void> {
    const providers = await this.store.list();

    for (const provider of providers) {
      if (
        provider.type === 'whatsapp_baileys' &&
        provider.autoConnect &&
        (await this.store.hasCredentials(provider.id))
      ) {
        void this.connect(provider.id).catch((error) => {
          this.logger.warn(
            `No se pudo reconectar provider ${provider.id}: ${String(error)}`,
          );
        });
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    const providerIds = [...this.runtime.keys()];
    for (const providerId of providerIds) {
      const connection = this.runtime.get(providerId);
      if (connection) {
        connection.manualClose = true;
        connection.socket.end(undefined);
      }
      await this.releaseProviderLease(providerId).catch(() => undefined);
    }
    this.runtime.clear();
  }

  onIncomingMessage(handler: ProviderMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  list(tenantId?: string): Promise<ProviderRecord[]> {
    return this.store.list(tenantId);
  }

  async get(
    id: string,
    tenantId?: string,
  ): Promise<ProviderConnectionView> {
    const provider = await this.requireProvider(id, tenantId);
    return this.withRuntime(provider);
  }

  async create(
    dto: CreateProviderDto,
    tenantId = 'default',
  ): Promise<ProviderRecord> {
    const now = new Date().toISOString();
    const provider: ProviderRecord = {
      id: randomUUID(),
      tenantId,
      name: dto.name.trim(),
      type: dto.type,
      status: 'disconnected',
      agentIds: this.unique(dto.agentIds ?? []),
      autoConnect: dto.autoConnect ?? true,
      createdAt: now,
      updatedAt: now,
    };

    return this.store.save(provider);
  }

  async update(
    id: string,
    dto: UpdateProviderDto,
    tenantId?: string,
  ): Promise<ProviderRecord> {
    const current = await this.requireProvider(id, tenantId);

    const updated: ProviderRecord = {
      ...current,
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.agentIds !== undefined
        ? { agentIds: this.unique(dto.agentIds) }
        : {}),
      ...(dto.autoConnect !== undefined
        ? { autoConnect: dto.autoConnect }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    return this.store.save(updated);
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    await this.requireProvider(id, tenantId);
    await this.disconnect(id, false, tenantId);
    await this.store.remove(id, tenantId);
  }

  async connect(
    id: string,
    tenantId?: string,
  ): Promise<ProviderConnectionView> {
    const provider = await this.requireProvider(id, tenantId);

    if (provider.type !== 'whatsapp_baileys') {
      throw new BadRequestException(
        `El provider ${provider.type} todavía no tiene adapter de conexión.`,
      );
    }

    const existing = this.runtime.get(id);
    if (existing && !existing.manualClose) {
      return this.withRuntime(provider);
    }

    const pendingTimer = this.reconnectTimers.get(id);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.reconnectTimers.delete(id);
    }

    const leaseAcquired = await this.redis.acquireLease(
      this.leaseKey(id),
      this.instanceId,
      this.leaseTtlSeconds,
    );

    if (!leaseAcquired) {
      throw new ConflictException(
        'Este provider está siendo administrado por otra instancia del runtime.',
      );
    }

    try {
      await this.patchRecord(provider, {
        status: 'connecting',
        lastError: undefined,
      });

      const { state, saveCreds } = await useMultiFileAuthState(
        this.store.authPath(id),
      );

      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        syncFullHistory: false,
      });

      const connection: RuntimeConnection = {
        socket,
        manualClose: false,
      };
      this.runtime.set(id, connection);
      this.startLeaseRenewal(id, connection);

      socket.ev.on('creds.update', saveCreds);

      socket.ev.on('connection.update', async (update) => {
        const current = await this.store.get(id);
        if (!current) return;

        if (update.qr) {
          connection.qr = update.qr;
          await this.patchRecord(current, {
            status: 'qr_pending',
            lastError: undefined,
          });
        }

        if (update.connection === 'open') {
          connection.qr = undefined;
          const phoneNumber = socket.user?.id
            ? socket.user.id.split(':')[0].split('@')[0]
            : undefined;

          await this.patchRecord(current, {
            status: 'connected',
            phoneNumber,
            displayName: socket.user?.name ?? current.displayName,
            lastConnectedAt: new Date().toISOString(),
            lastError: undefined,
          });
        }

        if (update.connection === 'close') {
          this.runtime.delete(id);
          await this.releaseProviderLease(id).catch(() => undefined);

          const statusCode = (
            update.lastDisconnect?.error as
              | { output?: { statusCode?: number } }
              | undefined
          )?.output?.statusCode;

          const loggedOut = statusCode === DisconnectReason.loggedOut;
          const latest = await this.store.get(id);
          if (!latest) return;

          await this.patchRecord(latest, {
            status: loggedOut ? 'error' : 'disconnected',
            lastError: loggedOut
              ? 'WhatsApp cerró la sesión. Debes escanear nuevamente.'
              : undefined,
          });

          if (!connection.manualClose && !loggedOut && latest.autoConnect) {
            this.scheduleReconnect(id);
          }
        }
      });

      socket.ev.on('messages.upsert', async ({ messages }) => {
        for (const message of messages) {
          if (message.key.fromMe) continue;

          const normalized = this.normalizeMessage(id, message);
          if (!normalized) continue;

          const current = await this.store.get(id);
          if (!current) continue;

          await this.patchRecord(current, {
            lastMessageAt: normalized.receivedAt,
          });

          for (const handler of this.messageHandlers) {
            void handler(normalized).catch((error) => {
              this.logger.error(
                `Error procesando mensaje ${normalized.messageId}: ${String(error)}`,
              );
            });
          }
        }
      });

      return this.withRuntime((await this.store.get(id)) ?? provider);
    } catch (error) {
      this.runtime.delete(id);
      await this.releaseProviderLease(id).catch(() => undefined);
      throw error;
    }
  }

  async sendText(
    providerId: string,
    agentId: string,
    recipient: string,
    text: string,
    tenantId?: string,
  ): Promise<{ messageId?: string }> {
    const provider = await this.requireProvider(providerId, tenantId);

    if (!provider.agentIds.includes(agentId)) {
      throw new ConflictException(
        `El agente "${agentId}" no está autorizado para usar "${provider.name}".`,
      );
    }

    const connection = this.runtime.get(providerId);
    if (!connection || provider.status !== 'connected') {
      throw new ConflictException(
        `El provider "${provider.name}" no está conectado en esta instancia.`,
      );
    }

    const jid = this.normalizeRecipient(recipient);
    const result = await connection.socket.sendMessage(jid, { text });

    return {
      messageId: result?.key.id ?? undefined,
    };
  }

  async disconnect(
    id: string,
    preserveCredentials = true,
    tenantId?: string,
  ): Promise<ProviderConnectionView> {
    const provider = await this.requireProvider(id, tenantId);
    const timer = this.reconnectTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(id);
    }

    const connection = this.runtime.get(id);
    if (connection) {
      connection.manualClose = true;
      this.runtime.delete(id);

      if (preserveCredentials) {
        connection.socket.end(undefined);
      } else {
        try {
          await connection.socket.logout();
        } catch {
          connection.socket.end(undefined);
        }
      }
    }

    await this.releaseProviderLease(id).catch(() => undefined);

    const updated = await this.patchRecord(provider, {
      status: 'disconnected',
      lastError: undefined,
    });

    return this.withRuntime(updated);
  }

  async connection(
    id: string,
    tenantId?: string,
  ): Promise<ProviderConnectionView> {
    const provider = await this.requireProvider(id, tenantId);
    return this.withRuntime(provider);
  }

  private normalizeMessage(
    providerId: string,
    message: WAMessage,
  ): NormalizedProviderMessage | null {
    const sender = message.key.remoteJid;
    const messageId = message.key.id;
    const text =
      message.message?.conversation ??
      message.message?.extendedTextMessage?.text ??
      message.message?.imageMessage?.caption ??
      message.message?.videoMessage?.caption ??
      message.message?.documentMessage?.caption ??
      '';

    if (!sender || !messageId || !text.trim()) return null;

    return {
      providerId,
      providerType: 'whatsapp_baileys',
      messageId,
      sender,
      conversationId: sender,
      text: text.trim(),
      receivedAt: new Date().toISOString(),
    };
  }

  private normalizeRecipient(recipient: string): string {
    if (recipient.includes('@')) return recipient;

    const digits = recipient.replace(/\D/g, '');
    if (!digits) {
      throw new BadRequestException('Destinatario inválido.');
    }

    return `${digits}@s.whatsapp.net`;
  }

  private async withRuntime(
    provider: ProviderRecord,
  ): Promise<ProviderConnectionView> {
    const qr = this.runtime.get(provider.id)?.qr;

    return {
      ...provider,
      ...(qr
        ? {
            qr,
            qrDataUrl: await QRCode.toDataURL(qr, {
              width: 320,
              margin: 2,
            }),
          }
        : {}),
    };
  }

  private async requireProvider(
    id: string,
    tenantId?: string,
  ): Promise<ProviderRecord> {
    const provider = await this.store.get(id, tenantId);
    if (!provider) {
      throw new NotFoundException(`Provider "${id}" no encontrado.`);
    }
    return provider;
  }

  private async patchRecord(
    current: ProviderRecord,
    patch: Partial<ProviderRecord>,
  ): Promise<ProviderRecord> {
    return this.store.save({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  private startLeaseRenewal(
    providerId: string,
    connection: RuntimeConnection,
  ): void {
    const previous = this.leaseTimers.get(providerId);
    if (previous) clearInterval(previous);

    const intervalMs = Math.max(
      5_000,
      Math.floor((this.leaseTtlSeconds * 1_000) / 3),
    );

    const timer = setInterval(() => {
      void this.redis
        .renewLease(
          this.leaseKey(providerId),
          this.instanceId,
          this.leaseTtlSeconds,
        )
        .then((renewed) => {
          if (renewed) return;

          this.logger.error(
            `Lease perdido para provider ${providerId}; se cierra el socket local.`,
          );
          connection.manualClose = true;
          this.runtime.delete(providerId);
          clearInterval(timer);
          this.leaseTimers.delete(providerId);
          connection.socket.end(
            new Error('Provider lease ownership lost'),
          );
        })
        .catch((error) => {
          this.logger.error(
            `No se pudo renovar lease de provider ${providerId}: ${String(error)}`,
          );
        });
    }, intervalMs);

    this.leaseTimers.set(providerId, timer);
  }

  private async releaseProviderLease(providerId: string): Promise<void> {
    const timer = this.leaseTimers.get(providerId);
    if (timer) {
      clearInterval(timer);
      this.leaseTimers.delete(providerId);
    }

    await this.redis.releaseLease(
      this.leaseKey(providerId),
      this.instanceId,
    );
  }

  private leaseKey(providerId: string): string {
    return `ivoolve:provider-owner:${providerId}`;
  }

  private unique(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private scheduleReconnect(id: string): void {
    if (this.reconnectTimers.has(id)) return;

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(id);
      void this.connect(id).catch((error) => {
        this.logger.warn(
          `Reintento fallido para provider ${id}: ${String(error)}`,
        );
        this.scheduleReconnect(id);
      });
    }, 5_000);

    this.reconnectTimers.set(id, timer);
  }
}
