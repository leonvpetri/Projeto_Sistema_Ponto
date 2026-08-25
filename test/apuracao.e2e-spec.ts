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
    const trocaCriada = listaAgostoRes.body.find(
      (t: { colaboradorOriginalId: string }) => t.colaboradorOriginalId === colaboradorId,
    );
    expect(trocaCriada).toBeDefined();
    // "data" é um dia, não um instante — precisa voltar exatamente como
    // enviado, sem deslocar 1 dia por causa do fuso horário do servidor
    expect(trocaCriada.data).toBe('2026-08-08');

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

  it('dataBaseEscala12x36 gera a paridade correta pelo caminho real (DTO → service → motor)', async () => {
    const jornada12x36Res = await request(app.getHttpServer())
      .post('/jornadas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: '12x36 E2E',
        tipo: 'ESCALA_12X36',
        cargaDiariaEsperadaMin: 720,
        toleranciaBancoHorasMin: 10,
      })
      .expect(201);

    const colaborador12x36Res = await request(app.getHttpServer())
      .post('/colaboradores')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Porteiro 12x36 E2E',
        cpf: '77788899900',
        setor: 'Portaria',
        jornadaId: jornada12x36Res.body.id,
        dataBaseEscala12x36: '2026-08-01',
      })
      .expect(201);
    // dataBaseEscala12x36 é um dia, não um instante — precisa voltar exatamente
    // como enviado (regressão do bug de fuso horário: new Date('YYYY-MM-DD')
    // parseava como UTC e invertia a paridade par/ímpar em 100% dos dias)
    expect(colaborador12x36Res.body.dataBaseEscala12x36).toBe('2026-08-01');
    const colaborador12x36Id = colaborador12x36Res.body.id;

    await request(app.getHttpServer())
      .post('/admin/apuracao/processar')
      .query({ mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const espelhoRes = await request(app.getHttpServer())
      .get('/admin/apuracao')
      .query({ colaboradorId: colaborador12x36Id, mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const porData = new Map(espelhoRes.body.map((d: { data: string }) => [d.data, d]));
    // a própria data-base é dia de trabalho (diffDias=0, par); depois alterna
    expect((porData.get('2026-08-01') as { diaEsperadoTrabalho: boolean }).diaEsperadoTrabalho).toBe(true);
    expect((porData.get('2026-08-02') as { diaEsperadoTrabalho: boolean }).diaEsperadoTrabalho).toBe(false);
    expect((porData.get('2026-08-03') as { diaEsperadoTrabalho: boolean }).diaEsperadoTrabalho).toBe(true);
    expect((porData.get('2026-08-04') as { diaEsperadoTrabalho: boolean }).diaEsperadoTrabalho).toBe(false);
  });

  it('12x36 noturno que atravessa a virada (turno pertence ao dia de entrada, não à data civil da saída)', async () => {
    const jornadaNoturnaRes = await request(app.getHttpServer())
      .post('/jornadas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: '12x36 Noturno E2E',
        tipo: 'ESCALA_12X36',
        horaEntradaPadrao: '18:00',
        horaSaidaPadrao: '06:00',
        cargaDiariaEsperadaMin: 720,
        toleranciaBancoHorasMin: 10,
      })
      .expect(201);
    const jornadaNoturnaId = jornadaNoturnaRes.body.id;

    async function processaCenario(nome: string, cpf: string, entradaISO: string, saidaISO: string) {
      const colaboradorRes = await request(app.getHttpServer())
        .post('/colaboradores')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome,
          cpf,
          setor: 'Segurança',
          jornadaId: jornadaNoturnaId,
          dataBaseEscala12x36: '2026-08-16',
        })
        .expect(201);
      const colaboradorNoturnoId = colaboradorRes.body.id;

      for (const [dataHora, tipo] of [
        [entradaISO, 'ENTRADA_1'],
        [saidaISO, 'SAIDA_1'],
      ]) {
        await request(app.getHttpServer())
          .post('/registros-ponto')
          .set('Authorization', `Bearer ${token}`)
          .send({ colaboradorId: colaboradorNoturnoId, dataHora, tipo })
          .expect(201);
      }

      await request(app.getHttpServer())
        .post('/admin/apuracao/processar')
        .query({ mes: '2026-08' })
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const espelhoRes = await request(app.getHttpServer())
        .get('/admin/apuracao')
        .query({ colaboradorId: colaboradorNoturnoId, mes: '2026-08' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      return new Map(espelhoRes.body.map((d: { data: string }) => [d.data, d]));
    }

    // Cenário do Antônio: entrada 16/08 17:49, saída 17/08 05:58.
    const porDataAntonio = await processaCenario(
      'Antônio Noturno E2E',
      '55566677788',
      '2026-08-16T17:49:00',
      '2026-08-17T05:58:00',
    );

    const dia16 = porDataAntonio.get('2026-08-16') as {
      diaEsperadoTrabalho: boolean;
      totalTrabalhadoMin: number | null;
      status: string;
      alertas: string[];
    };
    expect(dia16.diaEsperadoTrabalho).toBe(true);
    expect(dia16.totalTrabalhadoMin).toBe(729); // 17:49 → 05:58 (~12h09)
    expect(dia16.status).not.toBe('INCONSISTENTE');
    expect(dia16.alertas).not.toContain('Número ímpar de batidas no dia — falta uma marcação (entrada ou saída)');
    expect(dia16.alertas.some((a) => a.includes('Trabalhou em dia de folga'))).toBe(false);

    const dia17 = porDataAntonio.get('2026-08-17') as {
      diaEsperadoTrabalho: boolean;
      totalTrabalhadoMin: number | null;
      status: string;
    };
    expect(dia17.diaEsperadoTrabalho).toBe(false);
    expect(dia17.status).toBe('FOLGA');
    expect(dia17.totalTrabalhadoMin).toBeNull();

    // Colaborador batendo bem mais adiantado que o Antônio (2h antes da
    // entrada padrão 18:00) — é justamente esse tipo de adiantamento que
    // quebrava a primeira versão da correção (corte colado na hora de
    // entrada padrão, em vez de no meio do intervalo de descanso).
    const porDataAdiantado = await processaCenario(
      'Colaborador Noturno Adiantado E2E',
      '55566677799',
      '2026-08-16T16:00:00',
      '2026-08-17T05:58:00',
    );

    const dia16Adiantado = porDataAdiantado.get('2026-08-16') as {
      diaEsperadoTrabalho: boolean;
      totalTrabalhadoMin: number | null;
      status: string;
      alertas: string[];
    };
    expect(dia16Adiantado.diaEsperadoTrabalho).toBe(true);
    expect(dia16Adiantado.totalTrabalhadoMin).toBe(838); // 16:00 → 05:58 (~13h58)
    expect(dia16Adiantado.status).not.toBe('INCONSISTENTE');
    expect(
      dia16Adiantado.alertas.some((a) => a.includes('Trabalhou em dia de folga')),
    ).toBe(false);

    const dia17Adiantado = porDataAdiantado.get('2026-08-17') as {
      diaEsperadoTrabalho: boolean;
      status: string;
    };
    expect(dia17Adiantado.diaEsperadoTrabalho).toBe(false);
    expect(dia17Adiantado.status).toBe('FOLGA');
  });

  it('12x36 diurno (Daniela, 06:00→18:00) continua com a janela civil de sempre — sem mudança de comportamento', async () => {
    const jornadaDiurnaRes = await request(app.getHttpServer())
      .post('/jornadas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: '12x36 Diurno Daniela E2E',
        tipo: 'ESCALA_12X36',
        horaEntradaPadrao: '06:00',
        horaSaidaPadrao: '18:00',
        cargaDiariaEsperadaMin: 720,
        toleranciaBancoHorasMin: 10,
      })
      .expect(201);

    const danielaRes = await request(app.getHttpServer())
      .post('/colaboradores')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Daniela 12x36 E2E',
        cpf: '55566677700',
        setor: 'Portaria',
        jornadaId: jornadaDiurnaRes.body.id,
        dataBaseEscala12x36: '2026-08-16',
      })
      .expect(201);
    const danielaId = danielaRes.body.id;

    for (const [dataHora, tipo] of [
      ['2026-08-16T06:00:00', 'ENTRADA_1'],
      ['2026-08-16T18:00:00', 'SAIDA_1'],
    ]) {
      await request(app.getHttpServer())
        .post('/registros-ponto')
        .set('Authorization', `Bearer ${token}`)
        .send({ colaboradorId: danielaId, dataHora, tipo })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/admin/apuracao/processar')
      .query({ mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const espelhoRes = await request(app.getHttpServer())
      .get('/admin/apuracao')
      .query({ colaboradorId: danielaId, mes: '2026-08' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const porData = new Map(espelhoRes.body.map((d: { data: string }) => [d.data, d]));
    const dia16 = porData.get('2026-08-16') as {
      diaEsperadoTrabalho: boolean;
      totalTrabalhadoMin: number | null;
      status: string;
    };
    expect(dia16.diaEsperadoTrabalho).toBe(true);
    expect(dia16.totalTrabalhadoMin).toBe(720); // 06:00 → 18:00, 12h certinhas
    expect(dia16.status).toBe('OK');

    const dia17 = porData.get('2026-08-17') as { diaEsperadoTrabalho: boolean; status: string };
    expect(dia17.diaEsperadoTrabalho).toBe(false);
    expect(dia17.status).toBe('FOLGA');
  });
});
