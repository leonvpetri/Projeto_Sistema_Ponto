import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JornadasModule } from './jornadas/jornadas.module';
import { ColaboradoresModule } from './colaboradores/colaboradores.module';
import { RegistrosPontoModule } from './registros-ponto/registros-ponto.module';
import { TrocasEscalaModule } from './trocas-escala/trocas-escala.module';
import { ApuracaoModule } from './apuracao/apuracao.module';
import { ExtracoesPendentesModule } from './extracoes-pendentes/extracoes-pendentes.module';
import { ObservacoesDiaModule } from './observacoes-dia/observacoes-dia.module';
import { AfastamentosModule } from './afastamentos/afastamentos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    JornadasModule,
    ColaboradoresModule,
    RegistrosPontoModule,
    TrocasEscalaModule,
    ApuracaoModule,
    ExtracoesPendentesModule,
    ObservacoesDiaModule,
    AfastamentosModule,
  ],
})
export class AppModule {}
