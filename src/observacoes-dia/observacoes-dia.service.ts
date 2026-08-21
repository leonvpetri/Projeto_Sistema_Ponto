import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseDataISO } from '../apuracao/date-utils';
import { CreateObservacaoDiaDto } from './dto/create-observacao-dia.dto';

@Injectable()
export class ObservacoesDiaService {
  constructor(private prisma: PrismaService) {}

  upsert(dto: CreateObservacaoDiaDto) {
    const data = parseDataISO(dto.data);
    return this.prisma.observacaoDia.upsert({
      where: { colaboradorId_data: { colaboradorId: dto.colaboradorId, data } },
      create: { colaboradorId: dto.colaboradorId, data, texto: dto.texto },
      update: { texto: dto.texto },
    });
  }
}
