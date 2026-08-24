import { Module } from '@nestjs/common';
import { AfastamentosService } from './afastamentos.service';
import { AfastamentosController } from './afastamentos.controller';

@Module({
  controllers: [AfastamentosController],
  providers: [AfastamentosService],
  exports: [AfastamentosService],
})
export class AfastamentosModule {}
