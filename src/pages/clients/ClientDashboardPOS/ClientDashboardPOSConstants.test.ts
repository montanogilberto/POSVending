import { describe, expect, it } from 'vitest';
import type { WhatsAppThreadItem } from '../../../api/whatsappAgentApi';
import { filterMessages, messagesPhone10 } from './ClientDashboardPOSConstants';

const item = (over: Partial<WhatsAppThreadItem>): WhatsAppThreadItem => ({
  atUtc: '2026-11-01T10:00:00', kind: 'client', text: 'hola', detail: null, channel: null, status: null, error: null, ...over,
});

describe('messagesPhone10', () => {
  it('keeps the last 10 digits', () => {
    expect(messagesPhone10('+52 662-180-6214')).toBe('6621806214');
  });
  it('rejects missing, short and placeholder numbers', () => {
    expect(messagesPhone10(null)).toBeNull();
    expect(messagesPhone10('12345')).toBeNull();
    expect(messagesPhone10('0000000000')).toBeNull();
  });
});

describe('filterMessages', () => {
  const chat = item({});
  const bot = item({ kind: 'bot' });
  const push = item({ kind: 'notification', channel: 'push' });
  const template = item({ kind: 'notification', channel: 'whatsapp' });
  const sms = item({ kind: 'notification', channel: 'sms' });
  const all = [chat, bot, push, template, sms];
  it('Todo keeps everything', () => { expect(filterMessages(all, 'all')).toEqual(all); });
  it('WhatsApp keeps the chat and its templates', () => {
    expect(filterMessages(all, 'whatsapp')).toEqual([chat, bot, template]);
  });
  it('Push keeps only push', () => { expect(filterMessages(all, 'push')).toEqual([push]); });
});
