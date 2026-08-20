import { Module } from '@nestjs/common';
import { ApuracaoService } from './apuracao.service';
import { ApuracaoController } from './apuracao.controller';
import { ExtracoesController } from './extracoes.controller';

@Module({
  controllers: [ApuracaoController, ExtracoesController],
  providers: [ApuracaoService],
  exports: [ApuracaoService],
})
export class ApuracaoModule {}
