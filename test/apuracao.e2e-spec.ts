import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Fluxo completo de apuração (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let jornadaId: string;
  let colaboradorId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const registro = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'rh-e2e@empresa.com',
      nome: 'RH E2E',
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

  it('cadastra jornada, colaborador, lança pontos, processa apuração e consulta o espelho', async () => {
    const jornadaRes = await request(app.getHttpServer())
      .post('/jornadas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Administrativo E2E',
        tipo: 'PADRAO_5X2',
        cargaDiariaEsperadaMin: 480,
        toleranciaBancoHorasMin: 10,
      })
      .expect(201);
    jornadaId = jornadaRes.body.id;

    const colaboradorRes = await request(app.getHttpServer())
      .post('/colaboradores')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Colaborador E2E',
        cpf: '99988877766',
        setor: 'TI',
        jornadaId,
      })
      .expect(201);
    colaboradorId = colaboradorRes.body.id;

    const batidas = [
      ['2026-08-06T08:00:00', 'ENTRADA_1'],
      ['2026-08-06T12:00:00', 'SAIDA_1'],
      ['2026-08-06T13:00:00', 'ENTRADA_2'],
      ['2026-08-06T17:00:00', 'SAIDA_2'],
    ];
    for (const [dataHora, tipo] of batidas) {
      await request(app.getHttpServer())
        .post('/registros-ponto')
        .set('Authorization', `Bearer ${token}`)
        .send({ colaboradorId, dataHora, tipo })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/admin/apuracao/processar')
      .query({ mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const espelhoRes = await request(app.getHttpServer())
      .get('/admin/apuracao')
      .query({ colaboradorId, mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const dia6 = espelhoRes.body.find((d: { data: string }) => d.data === '2026-08-06');
    expect(dia6).toBeDefined();
    expect(dia6.diaEsperadoTrabalho).toBe(true);
    expect(dia6.totalTrabalhadoMin).toBe(480);
    expect(dia6.status).toBe('OK');
  });

  it('lista pendências (dias sem registro viram FALTA)', async () => {
    const pendenciasRes = await request(app.getHttpServer())
      .get('/admin/apuracao/pendencias')
      .query({ mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const faltaColaboradorE2e = pendenciasRes.body.filter(
      (p: { colaboradorId: string; status: string }) =>
        p.colaboradorId === colaboradorId && p.status === 'FALTA',
    );
    expect(faltaColaboradorE2e.length).toBeGreaterThan(0);
  });

  it('lista os registros de ponto de um colaborador num dia específico', async () => {
    const registrosRes = await request(app.getHttpServer())
      .get('/registros-ponto')
      .query({ colaboradorId, data: '2026-08-06' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(registrosRes.body).toHaveLength(4);
    expect(registrosRes.body.map((r: { tipo: string }) => r.tipo).sort()).toEqual(
      ['ENTRADA_1', 'ENTRADA_2', 'SAIDA_1', 'SAIDA_2'].sort(),
    );

    const outroDiaRes = await request(app.getHttpServer())
      .get('/registros-ponto')
      .query({ colaboradorId, data: '2026-08-07' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(outroDiaRes.body).toHaveLength(0);
  });

  it('lista os registros de ponto de um colaborador num mês inteiro', async () => {
    const mesRes = await request(app.getHttpServer())
      .get('/registros-ponto')
      .query({ colaboradorId, mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(mesRes.body).toHaveLength(4);

    const outroMesRes = await request(app.getHttpServer())
      .get('/registros-ponto')
      .query({ colaboradorId, mes: '2026-09' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(outroMesRes.body).toHaveLength(0);

    await request(app.getHttpServer())
      .get('/registros-ponto')
      .query({ colaboradorId })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/registros-ponto')
      .query({ colaboradorId, data: '2026-08-06', mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('cria e lista trocas de escala do mês', async () => {
    const substitutoRes = await request(app.getHttpServer())
      .post('/colaboradores')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Substituto E2E', cpf: '11122233344', setor: 'TI', jornadaId })
      .expect(201);
    const substitutoId = substitutoRes.body.id;

    await request(app.getHttpServer())
      .post('/trocas-escala')
      .set('Authorization', `Bearer ${token}`)
      .send({
        data: '2026-08-08',
        colaboradorOriginalId: colaboradorId,
        colaboradorSubstitutoId: substitutoId,
        supervisorInformado: 'Supervisor E2E',
        registradoPor: 'RH E2E',
      })
      .expect(201);

    const listaAgostoRes = await request(app.getHttpServer())
      .get('/trocas-escala')
      .query({ mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      listaAgostoRes.body.some((t: { colaboradorOriginalId: string }) => t.colaboradorOriginalId === colaboradorId),
    ).toBe(true);

    const listaSetembroRes = await request(app.getHttpServer())
      .get('/trocas-escala')
      .query({ mes: '2026-09' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      listaSetembroRes.body.some((t: { colaboradorOriginalId: string }) => t.colaboradorOriginalId === colaboradorId),
    ).toBe(false);
  });

  it('permite RH consultar espelho e pendências, mas não processar fechamento', async () => {
    const registroRh = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'rh-role-apuracao-e2e@empresa.com',
      nome: 'RH Role E2E',
      senha: 'senha123',
      role: 'RH',
    });
    const tokenRh = registroRh.body.accessToken;

    await request(app.getHttpServer())
      .get('/admin/apuracao')
      .query({ colaboradorId, mes: '2026-08' })
      .set('Authorization', `Bearer ${tokenRh}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/admin/apuracao/pendencias')
      .query({ mes: '2026-08' })
      .set('Authorization', `Bearer ${tokenRh}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/admin/apuracao/processar')
      .query({ mes: '2026-08' })
      .set('Authorization', `Bearer ${tokenRh}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/colaboradores')
      .set('Authorization', `Bearer ${tokenRh}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/colaboradores/${colaboradorId}`)
      .set('Authorization', `Bearer ${tokenRh}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/colaboradores')
      .set('Authorization', `Bearer ${tokenRh}`)
      .send({ nome: 'RH Não Pode Criar', cpf: '00011122233', setor: 'TI', jornadaId })
      .expect(403);
  });
});
