import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { janelaBatidasDoDia, parseDataHoraLiteralUTC, parseDataISO } from '../apuracao/date-utils';
import { CreateRegistroPontoDto } from './dto/create-registro-ponto.dto';
import { SubstituirRegistrosDoDiaDto } from './dto/substituir-registros-dia.dto';

@Injectable()
export class RegistrosPontoService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRegistroPontoDto) {
    return this.prisma.registroPonto.create({
      data: {
        colaboradorId: dto.colaboradorId,
        dataHora: parseDataHoraLiteralUTC(dto.dataHora),
        tipo: dto.tipo,
        origem: dto.origem ?? 'CARTAO_MECANICO',
      },
    });
  }

  findByColaboradorEPeriodo(colaboradorId: string, inicio: Date, fim: Date) {
    return this.prisma.registroPonto.findMany({
      where: { colaboradorId, dataHora: { gte: inicio, lt: fim } },
      orderBy: { dataHora: 'asc' },
    });
  }

  /**
   * Edição de um dia já lançado: apaga tudo que existir na janela de
   * batidas daquele dia (mesma janela do motor de apuração — absorve o
   * caso de turno noturno cruzando a meia-noite) e recria com o que veio
   * no body. Evita duplicar RegistroPonto ao "editar" pela tela de
   * Lançamento de Ponto, que antes só sabia criar.
   */
  async substituirRegistrosDoDia(dto: SubstituirRegistrosDoDiaDto) {
    const colaborador = await this.prisma.colaborador.findUnique({
      where: { id: dto.colaboradorId },
      include: { jornada: true },
    });
    if (!colaborador) throw new NotFoundException('Colaborador não encontrado');

    const inicioDiaCivil = parseDataISO(dto.data);
    const fimDiaCivil = new Date(
      inicioDiaCivil.getFullYear(),
      inicioDiaCivil.getMonth(),
      inicioDiaCivil.getDate() + 1,
    );
    const { inicio, fim } = janelaBatidasDoDia(colaborador.jornada, inicioDiaCivil, fimDiaCivil);

    await this.prisma.$transaction([
      this.prisma.registroPonto.deleteMany({
        where: { colaboradorId: dto.colaboradorId, dataHora: { gte: inicio, lt: fim } },
      }),
      ...dto.registros.map((registro) =>
        this.prisma.registroPonto.create({
          data: {
            colaboradorId: dto.colaboradorId,
            dataHora: parseDataHoraLiteralUTC(registro.dataHora),
            tipo: registro.tipo,
            origem: registro.origem ?? 'CARTAO_MECANICO',
          },
        }),
      ),
    ]);

    return this.findByColaboradorEPeriodo(dto.colaboradorId, inicio, fim);
  }
}
