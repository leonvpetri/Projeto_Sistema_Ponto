import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RegistrosPontoService } from './registros-ponto.service';
import { CreateRegistroPontoDto } from './dto/create-registro-ponto.dto';
import { ListarRegistrosPontoQueryDto } from './dto/listar-registros-ponto-query.dto';
import { periodoDoMes } from '../apuracao/date-utils';

@ApiTags('registros-ponto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.RH)
@Controller('registros-ponto')
export class RegistrosPontoController {
  constructor(private registrosPontoService: RegistrosPontoService) {}

  @Post()
  create(@Body() dto: CreateRegistroPontoDto) {
    return this.registrosPontoService.create(dto);
  }

  @Get()
  findDoPeriodo(@Query() dto: ListarRegistrosPontoQueryDto) {
    if (!dto.data && !dto.mes) {
      throw new BadRequestException('Informe data (dia) ou mes (mês).');
    }
    if (dto.data && dto.mes) {
      throw new BadRequestException('Informe apenas um dos dois: data ou mes.');
    }

    const { inicio, fim } = dto.mes
      ? periodoDoMes(dto.mes)
      : (() => {
          const inicioDia = new Date(`${dto.data}T00:00:00`);
          const fimDia = new Date(inicioDia.getFullYear(), inicioDia.getMonth(), inicioDia.getDate() + 1);
          return { inicio: inicioDia, fim: fimDia };
        })();

    return this.registrosPontoService.findByColaboradorEPeriodo(dto.colaboradorId, inicio, fim);
  }
}
