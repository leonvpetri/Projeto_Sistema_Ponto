import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RegistrosPontoService } from './registros-ponto.service';
import { CreateRegistroPontoDto } from './dto/create-registro-ponto.dto';
import { ListarRegistrosPontoQueryDto } from './dto/listar-registros-ponto-query.dto';

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
  findDoDia(@Query() dto: ListarRegistrosPontoQueryDto) {
    const inicio = new Date(`${dto.data}T00:00:00`);
    const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1);
    return this.registrosPontoService.findByColaboradorEPeriodo(dto.colaboradorId, inicio, fim);
  }
}
