import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Afastamentos (e2e)', () => {
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
      email: 'rh-afastamentos-e2e@empresa.com',
      nome: 'RH Afastamentos E2E',
      senha: 'senha123',
      role: 'ADMIN',
    });
    token = registro.body.accessToken;

    const jornadaRes = await request(app.getHttpServer())
      .post('/jornadas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Administrativo Afastamentos E2E',
        tipo: 'PADRAO_5X2',
        cargaDiariaEsperadaMin: 480,
        toleranciaBancoHorasMin: 10,
      })
      .expect(201);
    jornadaId = jornadaRes.body.id;

    const colaboradorRes = await request(app.getHttpServer())
      .post('/colaboradores')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Márcia Afastamentos E2E', cpf: '55566677788', setor: 'RH', jornadaId })
      .expect(201);
    colaboradorId = colaboradorRes.body.id;
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.$disconnect();
    await app.close();
  });

  it('rejeita motivo ausente quando tipo é OUTRO ou MOTIVO_PESSOAL', async () => {
    await request(app.getHttpServer())
      .post('/afastamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        colaboradorId,
        dataInicio: '2026-08-10',
        dataFim: '2026-08-10',
        tipo: 'OUTRO',
        abonado: false,
        registradoPor: 'RH E2E',
      })
      .expect(400);
  });

  it('cria, lista, edita e remove um afastamento', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/afastamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        colaboradorId,
        dataInicio: '2026-08-03',
        dataFim: '2026-08-07',
        tipo: 'FERIAS',
        abonado: true,
        registradoPor: 'RH E2E',
      })
      .expect(201);
    const afastamentoId = createRes.body.id;
    // datas de "dia" (não instante) precisam voltar exatamente como enviadas,
    // sem deslocar 1 dia por causa do fuso horário do servidor
    expect(createRes.body.dataInicio).toBe('2026-08-03');
    expect(createRes.body.dataFim).toBe('2026-08-07');

    const listaRes = await request(app.getHttpServer())
      .get('/afastamentos')
      .query({ colaboradorId, mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listaRes.body.some((a: { id: string }) => a.id === afastamentoId)).toBe(true);

    const listaOutroMesRes = await request(app.getHttpServer())
      .get('/afastamentos')
      .query({ colaboradorId, mes: '2026-09' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listaOutroMesRes.body).toHaveLength(0);

    await request(app.getHttpServer())
      .patch(`/afastamentos/${afastamentoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dataFim: '2026-08-06' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/afastamentos/${afastamentoId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listaAposDeleteRes = await request(app.getHttpServer())
      .get('/afastamentos')
      .query({ colaboradorId, mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listaAposDeleteRes.body).toHaveLength(0);
  });

  it('dia coberto por afastamento vira status AFASTAMENTO na apuração, não FALTA, e some das pendências', async () => {
    await request(app.getHttpServer())
      .post('/afastamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        colaboradorId,
        dataInicio: '2026-08-17',
        dataFim: '2026-08-19',
        tipo: 'ATESTADO_MEDICO',
        abonado: true,
        registradoPor: 'RH E2E',
      })
      .expect(201);

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

    const dia18 = espelhoRes.body.find((d: { data: string }) => d.data === '2026-08-18');
    expect(dia18.status).toBe('AFASTAMENTO');
    expect(dia18.afastamentoTipo).toBe('ATESTADO_MEDICO');
    expect(dia18.afastamentoAbonado).toBe(true);
    expect(dia18.totalTrabalhadoMin).toBeNull();
    expect(dia18.diferencaBancoHorasMin).toBeNull();

    const pendenciasRes = await request(app.getHttpServer())
      .get('/admin/apuracao/pendencias')
      .query({ mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      pendenciasRes.body.some(
        (p: { colaboradorId: string; data: string }) => p.colaboradorId === colaboradorId && p.data === '2026-08-18',
      ),
    ).toBe(false);
  });

  it('bater ponto num dia coberto por afastamento vira INCONSISTENTE, não escolhe um dos dois', async () => {
    await request(app.getHttpServer())
      .post('/afastamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        colaboradorId,
        dataInicio: '2026-08-24',
        dataFim: '2026-08-24',
        tipo: 'ATESTADO_MEDICO',
        abonado: true,
        registradoPor: 'RH E2E',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/registros-ponto')
      .set('Authorization', `Bearer ${token}`)
      .send({ colaboradorId, dataHora: '2026-08-24T08:00:00', tipo: 'ENTRADA_1' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/registros-ponto')
      .set('Authorization', `Bearer ${token}`)
      .send({ colaboradorId, dataHora: '2026-08-24T11:00:00', tipo: 'SAIDA_1' })
      .expect(201);

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

    const dia24 = espelhoRes.body.find((d: { data: string }) => d.data === '2026-08-24');
    expect(dia24.status).toBe('INCONSISTENTE');
    expect(dia24.afastamentoTipo).toBeNull();
    expect(dia24.alertas.some((a: string) => a.toLowerCase().includes('afastamento'))).toBe(true);
  });

  it('RH consegue usar o CRUD de afastamentos (mesma permissão de ADMIN)', async () => {
    const registroRh = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'rh-role-afastamentos-e2e@empresa.com',
      nome: 'RH Role Afastamentos E2E',
      senha: 'senha123',
      role: 'RH',
    });
    const tokenRh = registroRh.body.accessToken;

    const createRes = await request(app.getHttpServer())
      .post('/afastamentos')
      .set('Authorization', `Bearer ${tokenRh}`)
      .send({
        colaboradorId,
        dataInicio: '2026-08-28',
        dataFim: '2026-08-28',
        tipo: 'DOACAO_SANGUE',
        abonado: true,
        registradoPor: 'RH Role E2E',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/afastamentos')
      .query({ colaboradorId, mes: '2026-08' })
      .set('Authorization', `Bearer ${tokenRh}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/afastamentos/${createRes.body.id}`)
      .set('Authorization', `Bearer ${tokenRh}`)
      .expect(200);
  });
});
