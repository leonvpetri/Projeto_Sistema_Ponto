import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { periodoDoMes } from '../apuracao/date-utils';
import { AfastamentosService } from './afastamentos.service';
import { CreateAfastamentoDto } from './dto/create-afastamento.dto';
import { UpdateAfastamentoDto } from './dto/update-afastamento.dto';
import { ListarAfastamentosQueryDto } from './dto/listar-afastamentos-query.dto';

@ApiTags('afastamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.RH)
@Controller('afastamentos')
export class AfastamentosController {
  constructor(private afastamentosService: AfastamentosService) {}

  @Post()
  create(@Body() dto: CreateAfastamentoDto) {
    return this.afastamentosService.create(dto);
  }

  @Get()
  findAll(@Query() dto: ListarAfastamentosQueryDto) {
    return this.afastamentosService.findAll({
      colaboradorId: dto.colaboradorId,
      periodo: dto.mes ? periodoDoMes(dto.mes) : undefined,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAfastamentoDto) {
    return this.afastamentosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.afastamentosService.remove(id);
  }
}
