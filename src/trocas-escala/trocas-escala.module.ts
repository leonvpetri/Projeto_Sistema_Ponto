import { Module } from '@nestjs/common';
import { TrocasEscalaService } from './trocas-escala.service';
import { TrocasEscalaController } from './trocas-escala.controller';

@Module({
  controllers: [TrocasEscalaController],
  providers: [TrocasEscalaService],
  exports: [TrocasEscalaService],
})
export class TrocasEscalaModule {}
