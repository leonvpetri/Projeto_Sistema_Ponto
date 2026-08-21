import { Module } from '@nestjs/common';
import { RegistrosPontoService } from './registros-ponto.service';
import { RegistrosPontoController } from './registros-ponto.controller';
import { ExtracaoFotoService } from './extracao-foto.service';

@Module({
  controllers: [RegistrosPontoController],
  providers: [RegistrosPontoService, ExtracaoFotoService],
  exports: [RegistrosPontoService],
})
export class RegistrosPontoModule {}
