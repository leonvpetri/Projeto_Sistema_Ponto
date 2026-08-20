import { describe, expect, it } from 'vitest';
import { calcularApuracaoDia } from './apuracao-engine';
import { ColaboradorCalc, JornadaCalc, RegistroCalc, TrocaCalc } from './apuracao.types';
import { parseDataISO } from './date-utils';

function dt(dataStr: string, horaStr: string): Date {
  return new Date(`${dataStr}T${horaStr}:00`);
}
function reg(dataHora: Date): RegistroCalc {
  return { dataHora };
}

describe('ApuracaoEngine — calcularApuracaoDia', () => {
  it('Cenário 1 — Márcia (PADRAO_5X2): atrasada na entrada mas compensa saindo mais tarde → OK', () => {
    const jornadaMarcia: JornadaCalc = {
      tipo: 'PADRAO_5X2',
      cargaDiariaEsperadaMin: 8 * 60,
      toleranciaBancoHorasMin: 10,
      temAdicionalNoturno: false,
      horarioNoturnoInicio: '22:00',
      horarioNoturnoFim: '05:00',
      horaNoturnaReduzida: true,
    };
    const marcia: ColaboradorCalc = { id: 'marcia', dataBaseEscala12x36: null };

    const registrosDia6: RegistroCalc[] = [
      reg(dt('2026-08-06', '08:24')),
      reg(dt('2026-08-06', '12:07')),
      reg(dt('2026-08-06', '13:41')),
      reg(dt('2026-08-06', '17:27')),
    ];

    const resultado = calcularApuracaoDia({
      colaborador: marcia,
      jornada: jornadaMarcia,
      data: parseDataISO('2026-08-06'),
      registrosDoDia: registrosDia6,
      trocasDoDia: [],
    });

    // 08:24->12:07 = 223min, 13:41->17:27 = 226min => total 449min, carga 480min, diff -31 (fora tolerância)
    expect(resultado.diaEsperadoTrabalho).toBe(true);
    expect(resultado.totalTrabalhadoMin).toBe(449);
    expect(resultado.diferencaBancoHorasMin).toBe(-31);
    expect(resultado.status).toBe('ATRASO');
    expect(resultado.alertas).toEqual([]);
  });

  it('Cenário 2 — Comercial (COMPENSADO_SABADO): intervalo variável dentro da tolerância', () => {
    const jornadaComercial: JornadaCalc = {
      tipo: 'COMPENSADO_SABADO',
      cargaDiariaEsperadaMin: 8 * 60 + 30,
      duracaoIntervaloMin: 90,
      toleranciaIntervaloMin: 10,
      toleranciaBancoHorasMin: 10,
      temAdicionalNoturno: false,
      horarioNoturnoInicio: '22:00',
      horarioNoturnoFim: '05:00',
      horaNoturnaReduzida: true,
    };
    const comercial: ColaboradorCalc = { id: 'joao', dataBaseEscala12x36: null };

    const registrosComercial: RegistroCalc[] = [
      reg(dt('2026-08-10', '08:00')),
      reg(dt('2026-08-10', '11:45')),
      reg(dt('2026-08-10', '13:20')),
      reg(dt('2026-08-10', '18:05')),
    ];

    const resultado = calcularApuracaoDia({
      colaborador: comercial,
      jornada: jornadaComercial,
      data: parseDataISO('2026-08-10'),
      registrosDoDia: registrosComercial,
      trocasDoDia: [],
    });

    // intervalo real: 11:45 -> 13:20 = 95min, dentro de 90±10
    expect(resultado.alertas).toEqual([]);
    expect(resultado.status).not.toBe('INCONSISTENTE');
  });

  it('Cenário 3 — Porteiro (ESCALA_12X36 noturno): adicional noturno com hora reduzida', () => {
    const jornada12x36Noturno: JornadaCalc = {
      tipo: 'ESCALA_12X36',
      cargaTurno12x36Min: 12 * 60,
      toleranciaBancoHorasMin: 10,
      temAdicionalNoturno: true,
      horarioNoturnoInicio: '22:00',
      horarioNoturnoFim: '05:00',
      horaNoturnaReduzida: true,
    };
    const porteiro: ColaboradorCalc = {
      id: 'porteiro-1',
      dataBaseEscala12x36: parseDataISO('2026-08-01'),
    };

    const registrosPorteiro: RegistroCalc[] = [
      reg(dt('2026-08-03', '19:00')),
      reg(dt('2026-08-04', '07:00')),
    ];

    const resultado = calcularApuracaoDia({
      colaborador: porteiro,
      jornada: jornada12x36Noturno,
      data: parseDataISO('2026-08-03'),
      registrosDoDia: registrosPorteiro,
      trocasDoDia: [],
    });

    expect(resultado.diaEsperadoTrabalho).toBe(true);
    expect(resultado.totalTrabalhadoMin).toBe(720);
    // janela noturna 22:00-05:00 dentro de 19:00-07:00 = 7h de relógio = 420min
    expect(resultado.totalNoturnoMin).toBe(420);
    expect(resultado.totalNoturnoEquivalenteMin).toBe(Math.round(420 * (60 / 52.5)));
  });

  it('Cenário 4a — Troca de escala NÃO registrada: marca INCONSISTENTE', () => {
    const jornadaPedro: JornadaCalc = {
      tipo: 'PADRAO_5X2',
      cargaDiariaEsperadaMin: 8 * 60,
      toleranciaBancoHorasMin: 10,
      temAdicionalNoturno: false,
      horarioNoturnoInicio: '22:00',
      horarioNoturnoFim: '05:00',
      horaNoturnaReduzida: true,
    };
    const pedro: ColaboradorCalc = { id: 'pedro', dataBaseEscala12x36: null };

    const resultado = calcularApuracaoDia({
      colaborador: pedro,
      jornada: jornadaPedro,
      data: parseDataISO('2026-08-08'), // sábado — Pedro não deveria trabalhar
      registrosDoDia: [reg(dt('2026-08-08', '08:00')), reg(dt('2026-08-08', '16:00'))],
      trocasDoDia: [],
    });

    expect(resultado.diaEsperadoTrabalho).toBe(false);
    expect(resultado.status).toBe('INCONSISTENTE');
    expect(resultado.alertas.length).toBeGreaterThan(0);
  });

  it('Cenário 4b — Troca de escala registrada: dia passa a ser esperado, sem inconsistência', () => {
    const jornadaPedro: JornadaCalc = {
      tipo: 'PADRAO_5X2',
      cargaDiariaEsperadaMin: 8 * 60,
      toleranciaBancoHorasMin: 10,
      temAdicionalNoturno: false,
      horarioNoturnoInicio: '22:00',
      horarioNoturnoFim: '05:00',
      horaNoturnaReduzida: true,
    };
    const pedro: ColaboradorCalc = { id: 'pedro', dataBaseEscala12x36: null };
    const trocaExemplo: TrocaCalc = {
      colaboradorOriginalId: 'porteiro-1',
      colaboradorSubstitutoId: 'pedro',
    };

    const resultado = calcularApuracaoDia({
      colaborador: pedro,
      jornada: jornadaPedro,
      data: parseDataISO('2026-08-08'),
      registrosDoDia: [reg(dt('2026-08-08', '08:00')), reg(dt('2026-08-08', '16:00'))],
      trocasDoDia: [trocaExemplo],
    });

    expect(resultado.diaEsperadoTrabalho).toBe(true);
    expect(resultado.status).not.toBe('INCONSISTENTE');
  });
});
