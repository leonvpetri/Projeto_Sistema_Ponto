import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Fila do WhatsApp — revisão do RH (e2e)', () => {
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
      email: 'rh-whatsapp-e2e@empresa.com',
      nome: 'RH WhatsApp E2E',
      senha: 'senha123',
      role: 'ADMIN',
    });
    token = registro.body.accessToken;

    const jornadaRes = await request(app.getHttpServer())
      .post('/jornadas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Padrão E2E WhatsApp', tipo: 'PADRAO_5X2', cargaDiariaEsperadaMin: 480 });
    jornadaId = jornadaRes.body.id;

    const colaboradorRes = await request(app.getHttpServer())
      .post('/colaboradores')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Márcia Ferreira da Cunha',
        cpf: '042.329.836-43',
        telefone: '5534999999999',
        setor: 'Produção',
        jornadaId,
      });
    colaboradorId = colaboradorRes.body.id;
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.$disconnect();
    await app.close();
  });

  it('confirma uma extração identificada (telefone bate) e cria os RegistroPonto', async () => {
    const criarRes = await request(app.getHttpServer())
      .post('/extracoes-pendentes')
      .set('x-api-key', 'test-n8n-secret')
      .send({
        telefoneOrigem: '5534999999999',
        fotoUrl: 'https://exemplo.com/foto1.jpg',
        nomeExtraidoCartao: 'Márcia Ferreira da Cunha',
        cpfExtraidoCartao: '042.329.836-43',
        dadosExtraidosJson: JSON.stringify({ dias: [{ data: '2026-08-20' }] }),
      });
    expect(criarRes.status).toBe(201);
    const id = criarRes.body.id;

    const listaRes = await request(app.getHttpServer())
      .get('/extracoes-pendentes?status=PENDENTE')
      .set('Authorization', `Bearer ${token}`);
    expect(listaRes.status).toBe(200);
    const item = listaRes.body.find((e: any) => e.id === id);
    expect(item).toBeTruthy();
    expect(item.conferenciaOk).toBe(true);
    expect(item.colaborador.id).toBe(colaboradorId);
    expect(item.dadosExtraidos).toEqual({ dias: [{ data: '2026-08-20' }] });

    const confirmarRes = await request(app.getHttpServer())
      .post(`/extracoes-pendentes/${id}/confirmar`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        registros: [
          { dataHora: '2026-08-20T11:00:00Z', tipo: 'ENTRADA_1' },
          { dataHora: '2026-08-20T20:00:00Z', tipo: 'SAIDA_2' },
        ],
      });
    expect(confirmarRes.status).toBe(201);
    expect(confirmarRes.body.status).toBe('CONFIRMADA');
    expect(confirmarRes.body.revisadoPor).toBe('rh-whatsapp-e2e@empresa.com');

    const registros = await request(app.getHttpServer())
      .post('/registros-ponto')
      .set('Authorization', `Bearer ${token}`)
      .send({ colaboradorId, dataHora: '2026-08-21T11:00:00Z', tipo: 'ENTRADA_1', origem: 'CARTAO_MECANICO' });
    expect(registros.status).toBe(201);

    const prisma = app.get(PrismaService);
    const criados = await prisma.registroPonto.findMany({ where: { colaboradorId, origem: 'IMPORTACAO_FOTO' } });
    expect(criados).toHaveLength(2);

    // não pode revisar de novo
    const rejeitarDeNovo = await request(app.getHttpServer())
      .post(`/extracoes-pendentes/${id}/rejeitar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ motivoRejeicao: 'teste' });
    expect(rejeitarDeNovo.status).toBe(409);
  });

  it('rejeita uma extração com mismatch de nome/CPF', async () => {
    const criarRes = await request(app.getHttpServer())
      .post('/extracoes-pendentes')
      .set('x-api-key', 'test-n8n-secret')
      .send({
        telefoneOrigem: '5534999999999',
        fotoUrl: 'https://exemplo.com/foto2.jpg',
        nomeExtraidoCartao: 'Outra Pessoa',
        cpfExtraidoCartao: '999.999.999-99',
        dadosExtraidosJson: '{}',
      });
    const id = criarRes.body.id;

    const listaRes = await request(app.getHttpServer())
      .get('/extracoes-pendentes?status=PENDENTE')
      .set('Authorization', `Bearer ${token}`);
    const item = listaRes.body.find((e: any) => e.id === id);
    expect(item.conferenciaOk).toBe(false);
    expect(item.colaborador.id).toBe(colaboradorId);

    const rejeitarRes = await request(app.getHttpServer())
      .post(`/extracoes-pendentes/${id}/rejeitar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ motivoRejeicao: 'Pessoa errada' });
    expect(rejeitarRes.status).toBe(201);
    expect(rejeitarRes.body.status).toBe('REJEITADA');
    expect(rejeitarRes.body.motivoRejeicao).toBe('Pessoa errada');
  });

  it('vincula manualmente um colaborador a uma extração SEM_IDENTIFICACAO e então confirma', async () => {
    const criarRes = await request(app.getHttpServer())
      .post('/extracoes-pendentes')
      .set('x-api-key', 'test-n8n-secret')
      .send({
        telefoneOrigem: '5534988887777',
        fotoUrl: 'https://exemplo.com/foto3.jpg',
        dadosExtraidosJson: '{}',
      });
    const id = criarRes.body.id;
    expect(criarRes.status).toBe(201);

    const listaSemId = await request(app.getHttpServer())
      .get('/extracoes-pendentes?status=SEM_IDENTIFICACAO')
      .set('Authorization', `Bearer ${token}`);
    expect(listaSemId.body.find((e: any) => e.id === id)).toBeTruthy();

    const confirmarSemVincular = await request(app.getHttpServer())
      .post(`/extracoes-pendentes/${id}/confirmar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ registros: [{ dataHora: '2026-08-20T11:00:00Z', tipo: 'ENTRADA_1' }] });
    expect(confirmarSemVincular.status).toBe(400);

    const vincularRes = await request(app.getHttpServer())
      .post(`/extracoes-pendentes/${id}/vincular-colaborador`)
      .set('Authorization', `Bearer ${token}`)
      .send({ colaboradorId });
    expect(vincularRes.status).toBe(201);
    expect(vincularRes.body.status).toBe('PENDENTE');
    expect(vincularRes.body.colaboradorId).toBe(colaboradorId);

    const confirmarRes = await request(app.getHttpServer())
      .post(`/extracoes-pendentes/${id}/confirmar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ registros: [{ dataHora: '2026-08-22T11:00:00Z', tipo: 'ENTRADA_1' }] });
    expect(confirmarRes.status).toBe(201);
    expect(confirmarRes.body.status).toBe('CONFIRMADA');
  });

  it('bloqueia acesso sem token e rejeita chamada sem api-key no endpoint do n8n', async () => {
    const semToken = await request(app.getHttpServer()).get('/extracoes-pendentes');
    expect(semToken.status).toBe(401);

    const semApiKey = await request(app.getHttpServer()).post('/extracoes-pendentes').send({
      telefoneOrigem: '5534999999999',
      fotoUrl: 'x',
      dadosExtraidosJson: '{}',
    });
    expect(semApiKey.status).toBe(401);
  });

  it('permite role RH revisar a fila (não só ADMIN)', async () => {
    const registroRh = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'rh-role-e2e@empresa.com',
      nome: 'RH Puro E2E',
      senha: 'senha123',
      role: 'RH',
    });
    const tokenRh = registroRh.body.accessToken;

    const listaRes = await request(app.getHttpServer())
      .get('/extracoes-pendentes')
      .set('Authorization', `Bearer ${tokenRh}`);
    expect(listaRes.status).toBe(200);
  });
});
