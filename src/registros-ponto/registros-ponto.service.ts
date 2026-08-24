import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseDataHoraLiteralUTC } from '../apuracao/date-utils';
import { CreateRegistroPontoDto } from './dto/create-registro-ponto.dto';

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
}
