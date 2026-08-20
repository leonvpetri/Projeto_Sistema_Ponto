import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColaboradorDto } from './dto/create-colaborador.dto';
import { UpdateColaboradorDto } from './dto/update-colaborador.dto';

@Injectable()
export class ColaboradoresService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateColaboradorDto) {
    return this.prisma.colaborador.create({
      data: {
        ...dto,
        dataBaseEscala12x36: dto.dataBaseEscala12x36
          ? new Date(dto.dataBaseEscala12x36)
          : undefined,
      },
    });
  }

  findAll() {
    return this.prisma.colaborador.findMany({ include: { jornada: true } });
  }

  async findOne(id: string) {
    const colaborador = await this.prisma.colaborador.findUnique({
      where: { id },
      include: { jornada: true },
    });
    if (!colaborador) throw new NotFoundException('Colaborador não encontrado');
    return colaborador;
  }

  async update(id: string, dto: UpdateColaboradorDto) {
    await this.findOne(id);
    return this.prisma.colaborador.update({
      where: { id },
      data: {
        ...dto,
        dataBaseEscala12x36: dto.dataBaseEscala12x36
          ? new Date(dto.dataBaseEscala12x36)
          : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.colaborador.delete({ where: { id } });
  }
}
