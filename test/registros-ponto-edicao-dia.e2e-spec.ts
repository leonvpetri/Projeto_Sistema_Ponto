import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Edição de um dia já lançado (e2e) — apagar+recriar não duplica', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const registro = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'rh-edicao-dia-e2e@empresa.com',
      nome: 'RH Edição Dia E2E',
      senha: 'senha123',
      role: 'ADMIN',
    });
    token = registro.body.accessToken;
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.$disconnect();
    await app.close();
  });

  it('editar 1 campo de um dia diurno já lançado substitui, não duplica (regressão do bug real: Daniela ficou com 5 RegistroPonto em vez de 4)', async () => {
    const jornadaRes = await request(app.getHttpServer())
      .post('/jornadas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Padrão Edição Dia E2E', tipo: 'PADRAO_5X2', cargaDiariaEsperadaMin: 480 })
      .expect(201);

    const colaboradorRes = await request(app.getHttpServer())
      .post('/colaboradores')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Colaboradora Edição Dia E2E', cpf: '11133355577', setor: 'TI', jornadaId: jornadaRes.body.id })
      .expect(201);
    const colaboradorId = colaboradorRes.body.id;

    const batidasIniciais = [
      ['2026-08-17T08:00:00', 'ENTRADA_1'],
      ['2026-08-17T12:00:00', 'SAIDA_1'],
      ['2026-08-17T13:00:00', 'ENTRADA_2'],
      ['2026-08-17T17:00:00', 'SAIDA_2'],
    ];
    for (const [dataHora, tipo] of batidasIniciais) {
      await request(app.getHttpServer())
        .post('/registros-ponto')
        .set('Authorization', `Bearer ${token}`)
        .send({ colaboradorId, dataHora, tipo })
        .expect(201);
    }

    const antesRes = await request(app.getHttpServer())
      .get('/registros-ponto')
      .query({ colaboradorId, data: '2026-08-17' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(antesRes.body).toHaveLength(4);

    // Edita só ENTRADA_2 (12:00 → 12:09, mesmo cenário real da Daniela),
    // mantendo os outros 3 horários como já estavam.
    const substituirRes = await request(app.getHttpServer())
      .put('/registros-ponto/dia')
      .set('Authorization', `Bearer ${token}`)
      .send({
        colaboradorId,
        data: '2026-08-17',
        registros: [
          { dataHora: '2026-08-17T08:00:00', tipo: 'ENTRADA_1' },
          { dataHora: '2026-08-17T12:00:00', tipo: 'SAIDA_1' },
          { dataHora: '2026-08-17T13:09:00', tipo: 'ENTRADA_2' },
          { dataHora: '2026-08-17T17:00:00', tipo: 'SAIDA_2' },
        ],
      })
      .expect(200);
    expect(substituirRes.body).toHaveLength(4);

    const depoisRes = await request(app.getHttpServer())
      .get('/registros-ponto')
      .query({ colaboradorId, data: '2026-08-17' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // exatamente 4 — não 5 (era o bug: editar criava um 5º registro em vez
    // de substituir o ENTRADA_2 antigo)
    expect(depoisRes.body).toHaveLength(4);
    const porTipo = new Map(depoisRes.body.map((r: { tipo: string; dataHora: string }) => [r.tipo, r.dataHora]));
    expect(porTipo.get('ENTRADA_1')).toBe('2026-08-17T08:00:00.000Z');
    expect(porTipo.get('SAIDA_1')).toBe('2026-08-17T12:00:00.000Z');
    expect(porTipo.get('ENTRADA_2')).toBe('2026-08-17T13:09:00.000Z');
    expect(porTipo.get('SAIDA_2')).toBe('2026-08-17T17:00:00.000Z');

    const prisma = app.get(PrismaService);
    const totalNoBanco = await prisma.registroPonto.count({ where: { colaboradorId } });
    expect(totalNoBanco).toBe(4);
  });

  it('editar um dia noturno 12x36 que cruza a meia-noite usa a mesma janela do motor de apuração (não deixa órfão nem some com o turno)', async () => {
    const jornadaNoturnaRes = await request(app.getHttpServer())
      .post('/jornadas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: '12x36 Noturno Edição Dia E2E',
        tipo: 'ESCALA_12X36',
        horaEntradaPadrao: '18:00',
        horaSaidaPadrao: '06:00',
        cargaDiariaEsperadaMin: 720,
        toleranciaBancoHorasMin: 10,
      })
      .expect(201);

    const colaboradorRes = await request(app.getHttpServer())
      .post('/colaboradores')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Noturno Edição Dia E2E',
        cpf: '22244466688',
        setor: 'Segurança',
        jornadaId: jornadaNoturnaRes.body.id,
        dataBaseEscala12x36: '2026-08-16',
      })
      .expect(201);
    const colaboradorId = colaboradorRes.body.id;

    for (const [dataHora, tipo] of [
      ['2026-08-16T17:49:00', 'ENTRADA_1'],
      ['2026-08-17T05:58:00', 'SAIDA_1'],
    ]) {
      await request(app.getHttpServer())
        .post('/registros-ponto')
        .set('Authorization', `Bearer ${token}`)
        .send({ colaboradorId, dataHora, tipo })
        .expect(201);
    }

    // Edita a saída (05:58 → 06:05) — "dia" da edição é o dia de entrada
    // (16/08), igual à regra de negócio do motor de apuração.
    const substituirRes = await request(app.getHttpServer())
      .put('/registros-ponto/dia')
      .set('Authorization', `Bearer ${token}`)
      .send({
        colaboradorId,
        data: '2026-08-16',
        registros: [
          { dataHora: '2026-08-16T17:49:00', tipo: 'ENTRADA_1' },
          { dataHora: '2026-08-17T06:05:00', tipo: 'SAIDA_1' },
        ],
      })
      .expect(200);
    expect(substituirRes.body).toHaveLength(2);

    const prisma = app.get(PrismaService);
    const registros = await prisma.registroPonto.findMany({
      where: { colaboradorId },
      orderBy: { dataHora: 'asc' },
    });
    // exatamente 2 batidas no total — a saída antiga (05:58) foi substituída,
    // não deixou um registro órfão na tabela
    expect(registros).toHaveLength(2);
    expect(registros[0].dataHora.toISOString()).toBe('2026-08-16T17:49:00.000Z');
    expect(registros[1].dataHora.toISOString()).toBe('2026-08-17T06:05:00.000Z');
  });
});
