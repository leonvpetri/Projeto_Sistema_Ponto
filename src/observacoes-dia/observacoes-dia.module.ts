import { Module } from '@nestjs/common';
import { ObservacoesDiaService } from './observacoes-dia.service';
import { ObservacoesDiaController } from './observacoes-dia.controller';

@Module({
  controllers: [ObservacoesDiaController],
  providers: [ObservacoesDiaService],
  exports: [ObservacoesDiaService],
})
export class ObservacoesDiaModule {}
