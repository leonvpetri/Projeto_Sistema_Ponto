import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApuracaoService } from './apuracao.service';
import { ProcessarApuracaoDto } from './dto/processar-apuracao.dto';
import { ConsultarApuracaoDto } from './dto/consultar-apuracao.dto';
import { PendenciasApuracaoDto } from './dto/pendencias-apuracao.dto';

@ApiTags('apuracao')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/apuracao')
export class ApuracaoController {
  constructor(private apuracaoService: ApuracaoService) {}

  @Post('processar')
  @Roles(Role.ADMIN)
  processar(@Query() dto: ProcessarApuracaoDto) {
    return this.apuracaoService.processarMes(dto.mes);
  }

  @Get()
  @Roles(Role.ADMIN, Role.RH)
  buscar(@Query() dto: ConsultarApuracaoDto) {
    return this.apuracaoService.buscarApuracao(dto.colaboradorId, dto.mes);
  }

  @Get('pendencias')
  @Roles(Role.ADMIN, Role.RH)
  pendencias(@Query() dto: PendenciasApuracaoDto) {
    return this.apuracaoService.buscarPendencias(dto.mes);
  }
}
