import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ExtracoesPendentesService } from './extracoes-pendentes.service';
import { CriarExtracaoPendenteDto } from './dto/criar-extracao-pendente.dto';

/** Consumido pelo workflow n8n de extração de ponto via WhatsApp (autenticação por API key, não JWT de usuário). */
@ApiTags('extracoes-pendentes')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('extracoes-pendentes')
export class ExtracoesPendentesController {
  constructor(private service: ExtracoesPendentesService) {}

  @Post()
  async criar(@Body() dto: CriarExtracaoPendenteDto) {
    const extracao = await this.service.criar(dto);
    return { id: extracao.id };
  }
}
