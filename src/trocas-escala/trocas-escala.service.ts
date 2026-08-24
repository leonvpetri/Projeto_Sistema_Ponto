import { Injectable } from '@nestjs/common';
import { TrocaEscala } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatDataISO, parseDataISO } from '../apuracao/date-utils';
import { CreateTrocaEscalaDto } from './dto/create-troca-escala.dto';

// `data` é um conceito de "dia", não de instante — new Date(dto.data) parseia
// "YYYY-MM-DD" como meia-noite UTC, e devolver isso como Date faria o Nest
// serializar de volta deslocado (mesmo problema já corrigido em
// Afastamento/Colaborador). parseDataISO/formatDataISO tratam o dia como
// local dos dois lados.
function toApiShape(troca: TrocaEscala) {
  return { ...troca, data: formatDataISO(troca.data) };
}

@Injectable()
export class TrocasEscalaService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTrocaEscalaDto) {
    const troca = await this.prisma.trocaEscala.create({
      data: {
        ...dto,
        data: parseDataISO(dto.data.slice(0, 10)),
        confirmadoPeloRH: dto.confirmadoPeloRH ?? false,
        confirmadoEm: dto.confirmadoPeloRH ? new Date() : undefined,
      },
    });
    return toApiShape(troca);
  }

  async findByPeriodo(inicio: Date, fim: Date) {
    const trocas = await this.prisma.trocaEscala.findMany({
      where: { data: { gte: inicio, lt: fim } },
    });
    return trocas.map(toApiShape);
  }

  async findDoDia(data: Date) {
    const inicio = new Date(data);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);
    const trocas = await this.prisma.trocaEscala.findMany({
      where: { data: { gte: inicio, lt: fim } },
    });
    return trocas.map(toApiShape);
  }
}
