import { Module } from '@nestjs/common';
import { ExtracoesPendentesService } from './extracoes-pendentes.service';
import { ExtracoesPendentesController } from './extracoes-pendentes.controller';

@Module({
  controllers: [ExtracoesPendentesController],
  providers: [ExtracoesPendentesService],
})
export class ExtracoesPendentesModule {}
