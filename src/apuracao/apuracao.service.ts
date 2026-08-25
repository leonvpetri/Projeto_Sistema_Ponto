import { Injectable, NotFoundException } from '@nestjs/common';
import { Colaborador, Jornada } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularApuracaoDia } from './apuracao-engine';
import { ApuracaoResultado, StatusApuracao } from './apuracao.types';
import { formatDataISO, janelaBatidasDoDia, periodoDoMes } from './date-utils';

type ColaboradorComJornada = Colaborador & { jornada: Jornada };

@Injectable()
export class ApuracaoService {
  constructor(private prisma: PrismaService) {}

  /**
   * Processa a apuração de todos os colaboradores ativos para cada dia de
   * um mês (fechamento mensal), gerando/atualizando ApuracaoDiaria em lote.
   */
  async processarMes(mes: string): Promise<{ processados: number }> {
    const { inicio, fim } = periodoDoMes(mes);

    const colaboradores = await this.prisma.colaborador.findMany({
      where: { ativo: true },
      include: { jornada: true },
    });

    let processados = 0;
    for (const colaborador of colaboradores) {
      for (
        let data = new Date(inicio);
        data < fim;
        data = new Date(data.getFullYear(), data.getMonth(), data.getDate() + 1)
      ) {
        await this.processarDia(colaborador, data);
        processados++;
      }
    }

    return { processados };
  }

  private async processarDia(colaborador: ColaboradorComJornada, data: Date): Promise<void> {
    const inicioDia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const fimDia = new Date(inicioDia.getFullYear(), inicioDia.getMonth(), inicioDia.getDate() + 1);
    const { inicio: inicioBusca, fim: fimBusca } = janelaBatidasDoDia(
      colaborador.jornada,
      inicioDia,
      fimDia,
    );

    const [registrosDoDia, trocasDoDia, afastamentosDoDia] = await Promise.all([
      this.prisma.registroPonto.findMany({
        where: { colaboradorId: colaborador.id, dataHora: { gte: inicioBusca, lt: fimBusca } },
        orderBy: { dataHora: 'asc' },
      }),
      this.prisma.trocaEscala.findMany({
        where: {
          data: { gte: inicioDia, lt: fimDia },
          OR: [{ colaboradorOriginalId: colaborador.id }, { colaboradorSubstitutoId: colaborador.id }],
        },
      }),
      this.prisma.afastamento.findMany({
        where: { colaboradorId: colaborador.id, dataInicio: { lte: inicioDia }, dataFim: { gte: inicioDia } },
      }),
    ]);

    const resultado = calcularApuracaoDia({
      colaborador: { id: colaborador.id, dataBaseEscala12x36: colaborador.dataBaseEscala12x36 },
      jornada: colaborador.jornada,
      data: inicioDia,
      registrosDoDia,
      trocasDoDia,
      afastamentosDoDia,
    });

    await this.prisma.apuracaoDiaria.upsert({
      where: { colaboradorId_data: { colaboradorId: colaborador.id, data: inicioDia } },
      create: {
        colaboradorId: colaborador.id,
        data: inicioDia,
        diaEsperadoTrabalho: resultado.diaEsperadoTrabalho,
        totalTrabalhadoMin: resultado.totalTrabalhadoMin,
        totalNoturnoMin: resultado.totalNoturnoMin,
        totalNoturnoEquivalenteMin: resultado.totalNoturnoEquivalenteMin,
        cargaEsperadaMin: resultado.cargaEsperadaMin,
        diferencaBancoHorasMin: resultado.diferencaBancoHorasMin,
        status: resultado.status,
        alertas: JSON.stringify(resultado.alertas),
        afastamentoTipo: resultado.afastamentoTipo,
        afastamentoAbonado: resultado.afastamentoAbonado,
      },
      update: {
        diaEsperadoTrabalho: resultado.diaEsperadoTrabalho,
        totalTrabalhadoMin: resultado.totalTrabalhadoMin,
        totalNoturnoMin: resultado.totalNoturnoMin,
        totalNoturnoEquivalenteMin: resultado.totalNoturnoEquivalenteMin,
        cargaEsperadaMin: resultado.cargaEsperadaMin,
        diferencaBancoHorasMin: resultado.diferencaBancoHorasMin,
        status: resultado.status,
        alertas: JSON.stringify(resultado.alertas),
        afastamentoTipo: resultado.afastamentoTipo,
        afastamentoAbonado: resultado.afastamentoAbonado,
        calculadoEm: new Date(),
      },
    });
  }

  /** Espelho de ponto: apuração diária detalhada de um colaborador no período. */
  async buscarApuracao(colaboradorId: string, mes: string): Promise<ApuracaoResultado[]> {
    const colaborador = await this.prisma.colaborador.findUnique({ where: { id: colaboradorId } });
    if (!colaborador) throw new NotFoundException('Colaborador não encontrado');

    const { inicio, fim } = periodoDoMes(mes);
    const apuracoes = await this.prisma.apuracaoDiaria.findMany({
      where: { colaboradorId, data: { gte: inicio, lt: fim } },
      orderBy: { data: 'asc' },
    });

    return apuracoes.map((a) => ({
      colaboradorId: a.colaboradorId,
      data: formatDataISO(a.data),
      diaEsperadoTrabalho: a.diaEsperadoTrabalho,
      totalTrabalhadoMin: a.totalTrabalhadoMin,
      totalNoturnoMin: a.totalNoturnoMin,
      totalNoturnoEquivalenteMin: a.totalNoturnoEquivalenteMin,
      cargaEsperadaMin: a.cargaEsperadaMin,
      diferencaBancoHorasMin: a.diferencaBancoHorasMin,
      status: a.status as StatusApuracao,
      alertas: JSON.parse(a.alertas) as string[],
      afastamentoTipo: a.afastamentoTipo,
      afastamentoAbonado: a.afastamentoAbonado,
    }));
  }

  /** Pendências: dias INCONSISTENTE ou FALTA no período, para o RH revisar no fechamento. */
  async buscarPendencias(mes: string) {
    const { inicio, fim } = periodoDoMes(mes);
    const pendencias = await this.prisma.apuracaoDiaria.findMany({
      where: { data: { gte: inicio, lt: fim }, status: { in: ['INCONSISTENTE', 'FALTA'] } },
      include: { colaborador: true },
      orderBy: [{ data: 'asc' }, { colaboradorId: 'asc' }],
    });

    return pendencias.map((p) => ({
      colaboradorId: p.colaboradorId,
      colaboradorNome: p.colaborador.nome,
      data: formatDataISO(p.data),
      status: p.status,
      alertas: JSON.parse(p.alertas) as string[],
    }));
  }
}
