import { ForbiddenException, Injectable, NotFoundException, TooManyRequestsException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Socket } from 'socket.io';

type Pending = { code: string; socket: Socket; expiresAt: number; ip: string };
type Authorized = { hash: string; approvedAt: string; deviceName: string };
@Injectable()
export class ArgosPairingService {
  private readonly pending = new Map<string, Pending>();
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();
  private readonly file = process.env.ARGOS_PAIRING_DATA_FILE || join(process.env.RUNTIME_DATA_PATH || './data/runtime', 'argos-browser-devices.json');
  private readonly ttl = 5 * 60_000;
  private serialized = Promise.resolve();

  private async stored(): Promise<Authorized[]> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.file, 'utf8'));
      return Array.isArray(parsed) ? parsed as Authorized[] : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async save(records: Authorized[]): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    const temp = this.file + '.tmp';
    await writeFile(temp, JSON.stringify(records), { mode: 0o600 });
    await chmod(temp, 0o600);
    await rename(temp, this.file);
  }

  async valid(token: unknown): Promise<boolean> {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
    const candidate = Buffer.from(createHash('sha256').update(token).digest('hex'), 'hex');
    for (const record of await this.stored()) {
      if (!/^[a-f0-9]{64}$/.test(record.hash)) continue;
      const stored = Buffer.from(record.hash, 'hex');
      if (timingSafeEqual(candidate, stored)) return true;
    }
    return false;
  }

  start(socket: Socket): { code: string; expiresAt: string } {
    const ip = socket.handshake.address || 'unknown';
    const now = Date.now();
    const rate = this.attempts.get(ip);
    if (rate && rate.resetAt > now && rate.count >= 8) throw new TooManyRequestsException('Demasiadas solicitudes de emparejamiento.');
    this.attempts.set(ip, rate && rate.resetAt > now ? { ...rate, count: rate.count + 1 } : { count: 1, resetAt: now + 60 * 60_000 });
    if (this.pending.size >= 40) throw new TooManyRequestsException('Demasiados dispositivos pendientes.');
    // Código legible que se muestra en Chrome. La autorización requiere admin.
    let code = '';
    do { code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0'); }
    while (this.pending.has(code));
    const expiresAt = now + this.ttl;
    this.pending.set(code, { code, socket, expiresAt, ip });
    return { code, expiresAt: new Date(expiresAt).toISOString() };
  }

  list(): Array<{ code: string; expiresAt: string }> {
    const now = Date.now();
    for (const [code, p] of this.pending) if (p.expiresAt < now || !p.socket.connected) this.pending.delete(code);
    return [...this.pending.values()].map(p => ({ code: p.code, expiresAt: new Date(p.expiresAt).toISOString() }));
  }

  async devices(): Promise<Array<{ id: string; approvedAt: string; deviceName: string }>> {
    return (await this.stored()).map(row => ({ id: row.hash.slice(0, 12), approvedAt: row.approvedAt, deviceName: row.deviceName }));
  }

  approve(code: string): Promise<{ approved: boolean }> {
    const task = async () => {
      const pending = this.pending.get(code);
      if (!pending || pending.expiresAt < Date.now() || !pending.socket.connected) throw new NotFoundException('Código vencido. Abre Argos para solicitar uno nuevo.');
      if (!/^\d{6}$/.test(code)) throw new ForbiddenException('Código inválido');
      this.pending.delete(code); // Solo una aprobación por código
      const token = randomBytes(32).toString('hex');
      const hash = createHash('sha256').update(token).digest('hex');
      try {
        const records = await this.stored();
        records.push({ hash, approvedAt: new Date().toISOString(), deviceName: 'Chrome Argos' });
        await this.save(records);
      } catch (error) {
        this.pending.set(code, pending);
        throw error;
      }
      // Entrega de credencial únicamente al socket que originó el código.
      pending.socket.emit('argos:paired', { token });
      return { approved: true };
    };
    const result = this.serialized.then(task);
    this.serialized = result.then(() => undefined, () => undefined);
    return result;
  }

  revoke(id: string): Promise<{ revoked: boolean }> {
    const task = async () => {
      const records = await this.stored();
      const remaining = records.filter(r => r.hash.slice(0, 12) !== id);
      if (remaining.length === records.length) throw new NotFoundException('Dispositivo desconocido.');
      await this.save(remaining);
      return { revoked: true };
    };
    const result = this.serialized.then(task);
    this.serialized = result.then(() => undefined, () => undefined);
    return result;
  }

  disconnect(socket: Socket): void {
    for (const [code, pending] of this.pending) if (pending.socket.id === socket.id) this.pending.delete(code);
  }
}
