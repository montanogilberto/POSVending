import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./bankingApi', () => ({ ledgerBalance: vi.fn() }));

import { postCashTopUp, postTerminalTopUp } from './laundryWalletApi';

const fetchMock = vi.fn();
const reply = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body });
const sentTo = () => String(fetchMock.mock.calls[0][0]);
const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body);

const TERMINAL = {
  companyId: 1, clientId: 2049, amountMXN: 150, userId: 1,
  terminalId: 3, terminalName: 'Terminal Mercado Pago', operationNumber: '12345678901',
};

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('postTerminalTopUp', () => {
  it('goes to the staff terminal endpoint, which credits and sends the ticket', async () => {
    reply(200, { balanceAfter: 410, replayed: false });
    expect(await postTerminalTopUp(TERMINAL)).toEqual({ balanceAfter: 410, replayed: false });
    expect(sentTo()).toMatch(/\/walletTopUps\/terminal$/);
    expect(sentBody()).toMatchObject({ terminalId: 3, operationNumber: '12345678901', amountMXN: 150 });
  });

  it('reports an operation that was already registered', async () => {
    reply(200, { balanceAfter: 260, replayed: true });
    expect((await postTerminalTopUp(TERMINAL)).replayed).toBe(true);
  });

  it('throws when the backend refuses it', async () => {
    reply(400, { error: 'Número de operación inválido.' });
    await expect(postTerminalTopUp(TERMINAL)).rejects.toThrow('Número de operación inválido.');
  });
});

describe('postCashTopUp', () => {
  it('goes to the staff cash endpoint with the attempt key', async () => {
    reply(200, { balanceAfter: 300, replayed: false });
    const key = 'cash:1:2049:abc';
    expect(await postCashTopUp({ companyId: 1, clientId: 2049, amountMXN: 50, userId: 1, idempotencyKey: key }))
      .toEqual({ balanceAfter: 300 });
    expect(sentTo()).toMatch(/\/walletTopUps\/cash$/);
    expect(sentBody().idempotencyKey).toBe(key);
  });
});
