import { Module } from '@nestjs/common';
import { RegistrosPontoService } from './registros-ponto.service';
import { RegistrosPontoController } from './registros-ponto.controller';

@Module({
  controllers: [RegistrosPontoController],
  providers: [RegistrosPontoService],
  exports: [RegistrosPontoService],
})
export class RegistrosPontoModule {}
