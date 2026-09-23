import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Socket } from 'socket.io';
import { ArgosPairingService } from './argos-pairing.service';

describe('ArgosPairingService', () => {
  let dir: string;
  let pairing: ArgosPairingService;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'argos-pairing-test-'));
    process.env.ARGOS_PAIRING_DATA_FILE = join(dir, 'paired.json');
    pairing = new ArgosPairingService();
  });
  afterEach(async () => {
    delete process.env.ARGOS_PAIRING_DATA_FILE;
    await rm(dir, { recursive: true, force: true });
  });
  it('requiere aprobación de un administrador antes de emitir un token', async () => {
    const emitted: Array<{ name: string; payload: { token: string } }> = [];
    const socket = {
      id: 'chrome-one', connected: true,
      handshake: { address: '192.0.2.1' },
      emit: (name: string, payload: { token: string }) => { emitted.push({ name, payload }); return true; },
    } as unknown as Socket;
    const { code } = pairing.start(socket);
    expect(pairing.list().map(x => x.code)).toContain(code);
    expect(await pairing.valid('0'.repeat(64))).toBe(false);
    await pairing.approve(code);
    expect(pairing.list()).toEqual([]);
    const token = emitted.find(x => x.name === 'argos:paired')?.payload.token;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(await pairing.valid(token)).toBe(true);
    const [device] = await pairing.devices();
    await pairing.revoke(device.id);
    expect(await pairing.valid(token)).toBe(false);
  });

  it('rechaza códigos que no están pendientes', async () => {
    await expect(pairing.approve('123456')).rejects.toThrow('Código vencido');
  });
});
