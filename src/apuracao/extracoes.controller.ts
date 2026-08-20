import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ApuracaoService } from './apuracao.service';
import { PendenciasApuracaoDto } from './dto/pendencias-apuracao.dto';

/**
 * Consumido pelo n8n (autenticação via API key, não JWT de usuário) para
 * disparar notificações de pendências de fechamento ao RH.
 */
@ApiTags('extracoes')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('extracoes-pendentes')
export class ExtracoesController {
  constructor(private apuracaoService: ApuracaoService) {}

  @Get()
  pendencias(@Query() dto: PendenciasApuracaoDto) {
    return this.apuracaoService.buscarPendencias(dto.mes);
  }
}
