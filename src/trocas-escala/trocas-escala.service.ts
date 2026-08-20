import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrocaEscalaDto } from './dto/create-troca-escala.dto';

@Injectable()
export class TrocasEscalaService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateTrocaEscalaDto) {
    return this.prisma.trocaEscala.create({
      data: {
        ...dto,
        data: new Date(dto.data),
        confirmadoPeloRH: dto.confirmadoPeloRH ?? false,
        confirmadoEm: dto.confirmadoPeloRH ? new Date() : undefined,
      },
    });
  }

  findByPeriodo(inicio: Date, fim: Date) {
    return this.prisma.trocaEscala.findMany({
      where: { data: { gte: inicio, lt: fim } },
    });
  }

  findDoDia(data: Date) {
    const inicio = new Date(data);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);
    return this.prisma.trocaEscala.findMany({
      where: { data: { gte: inicio, lt: fim } },
    });
  }
}
