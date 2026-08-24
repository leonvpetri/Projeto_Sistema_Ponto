import { afterEach, describe, expect, it } from 'vitest';
import { parseDataHoraLiteralUTC } from './date-utils';

describe('parseDataHoraLiteralUTC', () => {
  const tzOriginal = process.env.TZ;
  afterEach(() => {
    process.env.TZ = tzOriginal;
  });

  it('trata "YYYY-MM-DDTHH:mm:ss" como dígito literal em UTC, ignorando o TZ do processo', () => {
    for (const tz of ['UTC', 'America/Sao_Paulo', 'Europe/Moscow', 'Pacific/Kiritimati']) {
      process.env.TZ = tz;
      const resultado = parseDataHoraLiteralUTC('2026-08-03T07:58:00');
      expect(resultado.toISOString()).toBe('2026-08-03T07:58:00.000Z');
    }
  });

  it('aceita "YYYY-MM-DDTHH:mm" sem segundos (formato que o front-end monta)', () => {
    process.env.TZ = 'America/Sao_Paulo';
    expect(parseDataHoraLiteralUTC('2026-08-03T07:58').toISOString()).toBe('2026-08-03T07:58:00.000Z');
  });

  it('não reinterpreta strings que já vêm com timezone explícito (Z ou offset)', () => {
    process.env.TZ = 'America/Sao_Paulo';
    expect(parseDataHoraLiteralUTC('2026-08-03T07:58:00Z').toISOString()).toBe('2026-08-03T07:58:00.000Z');
    expect(parseDataHoraLiteralUTC('2026-08-03T07:58:00-03:00').toISOString()).toBe('2026-08-03T10:58:00.000Z');
  });
});
