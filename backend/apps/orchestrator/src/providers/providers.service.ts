import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';

import { AgentRegistryService } from '../agents/agent-registry.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
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
export class ProvidersService implements OnModuleInit {
  private readonly logger = new Logger(ProvidersService.name);
  private readonly runtime = new Map<string, RuntimeConnection>();
  private readonly reconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly store: ProviderStoreService,
    private readonly agents: AgentRegistryService,
  ) {}

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

  list(): Promise<ProviderRecord[]> {
    return this.store.list();
  }

  async get(id: string): Promise<ProviderConnectionView> {
    const provider = await this.requireProvider(id);
    return this.withRuntime(provider);
  }

  async create(dto: CreateProviderDto): Promise<ProviderRecord> {
    await this.validateAgents(dto.agentIds ?? []);

    const now = new Date().toISOString();
    const provider: ProviderRecord = {
      id: randomUUID(),
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

  async update(id: string, dto: UpdateProviderDto): Promise<ProviderRecord> {
    const current = await this.requireProvider(id);
    const agentIds = dto.agentIds ?? current.agentIds;
    await this.validateAgents(agentIds);

    const updated: ProviderRecord = {
      ...current,
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.agentIds !== undefined ? { agentIds: this.unique(dto.agentIds) } : {}),
      ...(dto.autoConnect !== undefined ? { autoConnect: dto.autoConnect } : {}),
      updatedAt: new Date().toISOString(),
    };

    return this.store.save(updated);
  }

  async remove(id: string): Promise<void> {
    await this.requireProvider(id);
    await this.disconnect(id, false);
    await this.store.remove(id);
  }

  async connect(id: string): Promise<ProviderConnectionView> {
    const provider = await this.requireProvider(id);

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
      const incoming = messages.some((message) => !message.key.fromMe);
      if (!incoming) return;

      const current = await this.store.get(id);
      if (!current) return;

      // En esta fase registramos actividad del canal. El siguiente paso del
      // runtime podrá enrutar el mensaje a cualquiera de agentIds.
      await this.patchRecord(current, {
        lastMessageAt: new Date().toISOString(),
      });
    });

    return this.withRuntime((await this.store.get(id)) ?? provider);
  }

  async disconnect(
    id: string,
    preserveCredentials = true,
  ): Promise<ProviderConnectionView> {
    const provider = await this.requireProvider(id);
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

    const updated = await this.patchRecord(provider, {
      status: 'disconnected',
      lastError: undefined,
    });

    return this.withRuntime(updated);
  }

  async connection(id: string): Promise<ProviderConnectionView> {
    const provider = await this.requireProvider(id);
    return this.withRuntime(provider);
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

  private async requireProvider(id: string): Promise<ProviderRecord> {
    const provider = await this.store.get(id);
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

  private async validateAgents(agentIds: string[]): Promise<void> {
    const missing = this.unique(agentIds).filter((id) => !this.agents.get(id));

    if (missing.length > 0) {
      throw new ConflictException(
        `Agentes no registrados: ${missing.join(', ')}.`,
      );
    }
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
