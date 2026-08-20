import { Module } from '@nestjs/common';
import { ApuracaoService } from './apuracao.service';
import { ApuracaoController } from './apuracao.controller';

@Module({
  controllers: [ApuracaoController],
  providers: [ApuracaoService],
  exports: [ApuracaoService],
})
export class ApuracaoModule {}
