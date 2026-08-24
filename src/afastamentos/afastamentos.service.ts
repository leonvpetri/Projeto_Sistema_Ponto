import { Injectable, NotFoundException } from '@nestjs/common';
import { Afastamento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatDataISO, parseDataISO } from '../apuracao/date-utils';
import { CreateAfastamentoDto } from './dto/create-afastamento.dto';
import { UpdateAfastamentoDto } from './dto/update-afastamento.dto';

// dataInicio/dataFim são conceitos de "dia", não de instante — serializar como
// Date faria o Nest devolver ISO em UTC (ex.: "2026-08-04T22:00:00.000Z" pra
// meia-noite local num fuso UTC+2), deslocando o dia em 1 pro front-end que
// só lê os 10 primeiros caracteres. Mesmo problema que formatDataISO já evita
// em ApuracaoDiaria — aqui resolvido devolvendo "YYYY-MM-DD" puro.
function toApiShape(afastamento: Afastamento) {
  return {
    ...afastamento,
    dataInicio: formatDataISO(afastamento.dataInicio),
    dataFim: formatDataISO(afastamento.dataFim),
  };
}

@Injectable()
export class AfastamentosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAfastamentoDto) {
    const afastamento = await this.prisma.afastamento.create({
      data: {
        ...dto,
        dataInicio: parseDataISO(dto.dataInicio.slice(0, 10)),
        dataFim: parseDataISO(dto.dataFim.slice(0, 10)),
      },
    });
    return toApiShape(afastamento);
  }

  async findAll(params: { colaboradorId?: string; periodo?: { inicio: Date; fim: Date } }) {
    const afastamentos = await this.prisma.afastamento.findMany({
      where: {
        colaboradorId: params.colaboradorId,
        ...(params.periodo && {
          dataInicio: { lt: params.periodo.fim },
          dataFim: { gte: params.periodo.inicio },
        }),
      },
      orderBy: { dataInicio: 'asc' },
    });
    return afastamentos.map(toApiShape);
  }

  async findOne(id: string) {
    const afastamento = await this.prisma.afastamento.findUnique({ where: { id } });
    if (!afastamento) throw new NotFoundException('Afastamento não encontrado');
    return afastamento;
  }

  async update(id: string, dto: UpdateAfastamentoDto) {
    await this.findOne(id);
    const afastamento = await this.prisma.afastamento.update({
      where: { id },
      data: {
        ...dto,
        dataInicio: dto.dataInicio ? parseDataISO(dto.dataInicio.slice(0, 10)) : undefined,
        dataFim: dto.dataFim ? parseDataISO(dto.dataFim.slice(0, 10)) : undefined,
      },
    });
    return toApiShape(afastamento);
  }

  async remove(id: string) {
    await this.findOne(id);
    const afastamento = await this.prisma.afastamento.delete({ where: { id } });
    return toApiShape(afastamento);
  }
}
