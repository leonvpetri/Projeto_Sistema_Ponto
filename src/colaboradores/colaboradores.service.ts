import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatDataISO, parseDataISO } from '../apuracao/date-utils';
import { CreateColaboradorDto } from './dto/create-colaborador.dto';
import { UpdateColaboradorDto } from './dto/update-colaborador.dto';

// dataBaseEscala12x36 é um conceito de "dia", não de instante — devolvê-lo
// como Date faria o Nest serializar em ISO UTC (ex.: meia-noite local num
// fuso UTC+2 vira "...T22:00:00.000Z" do dia anterior), deslocando o dia em
// 1 pro front-end que só lê os 10 primeiros caracteres. Mesmo ajuste já
// feito em Afastamento/ApuracaoDiaria — aqui devolvido como "YYYY-MM-DD" puro.
function toApiShape<T extends { dataBaseEscala12x36: Date | null }>(colaborador: T) {
  return {
    ...colaborador,
    dataBaseEscala12x36: colaborador.dataBaseEscala12x36
      ? formatDataISO(colaborador.dataBaseEscala12x36)
      : null,
  };
}

@Injectable()
export class ColaboradoresService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateColaboradorDto) {
    const colaborador = await this.prisma.colaborador.create({
      data: {
        ...dto,
        dataBaseEscala12x36: dto.dataBaseEscala12x36
          ? parseDataISO(dto.dataBaseEscala12x36.slice(0, 10))
          : undefined,
      },
    });
    return toApiShape(colaborador);
  }

  async findAll() {
    const colaboradores = await this.prisma.colaborador.findMany({ include: { jornada: true } });
    return colaboradores.map(toApiShape);
  }

  async findOne(id: string) {
    const colaborador = await this.prisma.colaborador.findUnique({
      where: { id },
      include: { jornada: true },
    });
    if (!colaborador) throw new NotFoundException('Colaborador não encontrado');
    return toApiShape(colaborador);
  }

  async update(id: string, dto: UpdateColaboradorDto) {
    await this.findOne(id);
    const colaborador = await this.prisma.colaborador.update({
      where: { id },
      data: {
        ...dto,
        dataBaseEscala12x36: dto.dataBaseEscala12x36
          ? parseDataISO(dto.dataBaseEscala12x36.slice(0, 10))
          : undefined,
      },
    });
    return toApiShape(colaborador);
  }

  async remove(id: string) {
    await this.findOne(id);
    const colaborador = await this.prisma.colaborador.delete({ where: { id } });
    return toApiShape(colaborador);
  }
}
