import { afterEach, describe, expect, it } from 'vitest';
import { janelaBatidasDoDia, parseDataHoraLiteralUTC } from './date-utils';

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

describe('janelaBatidasDoDia', () => {
  const inicioDiaCivil = new Date(2026, 7, 16);
  const fimDiaCivil = new Date(2026, 7, 17);

  it('turno que cruza a meia-noite (saída < entrada): corta no meio do intervalo de descanso, não na hora de entrada', () => {
    const { inicio, fim } = janelaBatidasDoDia(
      { horaEntradaPadrao: '18:00', horaSaidaPadrao: '06:00' },
      inicioDiaCivil,
      fimDiaCivil,
    );
    // descanso é 06:00-18:00 (12h) → corte no meio, 12:00, não às 18:00
    expect(inicio).toEqual(new Date(2026, 7, 16, 12, 0, 0, 0));
    expect(fim).toEqual(new Date(2026, 7, 17, 12, 0, 0, 0));
  });

  it('turno diurno (entrada < saída): janela civil inalterada', () => {
    const { inicio, fim } = janelaBatidasDoDia(
      { horaEntradaPadrao: '06:00', horaSaidaPadrao: '18:00' },
      inicioDiaCivil,
      fimDiaCivil,
    );
    expect(inicio).toEqual(inicioDiaCivil);
    expect(fim).toEqual(fimDiaCivil);
  });

  it('sem horaEntradaPadrao/horaSaidaPadrao configurados: janela civil inalterada', () => {
    const { inicio, fim } = janelaBatidasDoDia({}, inicioDiaCivil, fimDiaCivil);
    expect(inicio).toEqual(inicioDiaCivil);
    expect(fim).toEqual(fimDiaCivil);
  });
});
