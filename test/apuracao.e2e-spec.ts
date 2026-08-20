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
});
