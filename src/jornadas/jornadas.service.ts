import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJornadaDto } from './dto/create-jornada.dto';
import { UpdateJornadaDto } from './dto/update-jornada.dto';

@Injectable()
export class JornadasService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateJornadaDto) {
    return this.prisma.jornada.create({ data: dto });
  }

  findAll() {
    return this.prisma.jornada.findMany();
  }

  async findOne(id: string) {
    const jornada = await this.prisma.jornada.findUnique({ where: { id } });
    if (!jornada) throw new NotFoundException('Jornada não encontrada');
    return jornada;
  }

  async update(id: string, dto: UpdateJornadaDto) {
    await this.findOne(id);
    return this.prisma.jornada.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.jornada.delete({ where: { id } });
  }
}
