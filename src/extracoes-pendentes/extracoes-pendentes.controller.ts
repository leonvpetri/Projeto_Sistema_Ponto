import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ExtracoesPendentesService } from './extracoes-pendentes.service';
import { CriarExtracaoPendenteDto } from './dto/criar-extracao-pendente.dto';
import { ListarExtracoesQueryDto } from './dto/listar-extracoes-query.dto';
import { ConfirmarExtracaoDto } from './dto/confirmar-extracao.dto';
import { RejeitarExtracaoDto } from './dto/rejeitar-extracao.dto';
import { VincularColaboradorDto } from './dto/vincular-colaborador.dto';

interface RequestComUsuario extends Request {
  user: { id: string; email: string; role: string };
}

@ApiTags('extracoes-pendentes')
@Controller('extracoes-pendentes')
export class ExtracoesPendentesController {
  constructor(private service: ExtracoesPendentesService) {}

  /** Consumido pelo workflow n8n de extração de ponto via WhatsApp (autenticação por API key, não JWT de usuário). */
  @Post()
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  async criar(@Body() dto: CriarExtracaoPendenteDto) {
    const extracao = await this.service.criar(dto);
    return { id: extracao.id };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RH)
  listar(@Query() dto: ListarExtracoesQueryDto) {
    return this.service.listar(dto.status);
  }

  @Post(':id/confirmar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RH)
  confirmar(@Param('id') id: string, @Body() dto: ConfirmarExtracaoDto, @Req() req: RequestComUsuario) {
    return this.service.confirmar(id, dto, req.user.email);
  }

  @Post(':id/rejeitar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RH)
  rejeitar(@Param('id') id: string, @Body() dto: RejeitarExtracaoDto, @Req() req: RequestComUsuario) {
    return this.service.rejeitar(id, dto, req.user.email);
  }

  @Post(':id/vincular-colaborador')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RH)
  vincularColaborador(@Param('id') id: string, @Body() dto: VincularColaboradorDto) {
    return this.service.vincularColaborador(id, dto);
  }
}
