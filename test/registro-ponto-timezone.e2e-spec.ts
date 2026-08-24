import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Regressão do bug de +3h: os 3 fluxos que criam RegistroPonto (lançamento
 * manual, lançamento por foto — ambos via POST /registros-ponto — e
 * confirmação da fila do WhatsApp via POST /extracoes-pendentes/:id/confirmar)
 * montam "YYYY-MM-DDTHH:mm:00" no front-end sem timezone. O dígito precisa
 * virar UTC literal, não hora local do processo — ver parseDataHoraLiteralUTC
 * em src/apuracao/date-utils.ts. As asserções abaixo comparam contra o ISO
 * absoluto esperado (não uma comparação relativa), então continuam válidas
 * não importa o TZ da máquina que rodar a suíte.
 */
describe('RegistroPonto — mesma convenção de horário nos 3 fluxos de criação (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let colaboradorId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const registro = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'rh-tz-e2e@empresa.com',
      nome: 'RH Timezone E2E',
      senha: 'senha123',
      role: 'ADMIN',
    });
    token = registro.body.accessToken;

    const jornadaRes = await request(app.getHttpServer())
      .post('/jornadas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Padrão E2E Timezone', tipo: 'PADRAO_5X2', cargaDiariaEsperadaMin: 480 });

    const colaboradorRes = await request(app.getHttpServer())
      .post('/colaboradores')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Márcia Timezone E2E',
        cpf: '111.111.111-11',
        telefone: '5534988880000',
        setor: 'Produção',
        jornadaId: jornadaRes.body.id,
      });
    colaboradorId = colaboradorRes.body.id;
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.$disconnect();
    await app.close();
  });

  it('lançamento manual (POST /registros-ponto) grava "07:58" como 07:58 UTC, dígito literal', async () => {
    const res = await request(app.getHttpServer())
      .post('/registros-ponto')
      .set('Authorization', `Bearer ${token}`)
      .send({ colaboradorId, dataHora: '2026-08-03T07:58:00', tipo: 'ENTRADA_1', origem: 'CARTAO_MECANICO' });
    expect(res.status).toBe(201);

    const prisma = app.get(PrismaService);
    const criado = await prisma.registroPonto.findUnique({ where: { id: res.body.id } });
    expect(criado?.dataHora.toISOString()).toBe('2026-08-03T07:58:00.000Z');
  });

  it('lançamento por foto (mesmo endpoint POST /registros-ponto, origem IMPORTACAO_FOTO) grava o mesmo dígito literal', async () => {
    const res = await request(app.getHttpServer())
      .post('/registros-ponto')
      .set('Authorization', `Bearer ${token}`)
      .send({ colaboradorId, dataHora: '2026-08-04T07:58:00', tipo: 'ENTRADA_1', origem: 'IMPORTACAO_FOTO' });
    expect(res.status).toBe(201);

    const prisma = app.get(PrismaService);
    const criado = await prisma.registroPonto.findUnique({ where: { id: res.body.id } });
    expect(criado?.dataHora.toISOString()).toBe('2026-08-04T07:58:00.000Z');
  });

  it('confirmação da fila do WhatsApp (POST /extracoes-pendentes/:id/confirmar) grava o mesmo dígito literal', async () => {
    const criarRes = await request(app.getHttpServer())
      .post('/extracoes-pendentes')
      .set('x-api-key', 'test-n8n-secret')
      .send({
        telefoneOrigem: '5534988880000',
        fotoUrl: 'https://exemplo.com/foto-tz.jpg',
        nomeExtraidoCartao: 'Márcia Timezone E2E',
        cpfExtraidoCartao: '111.111.111-11',
        dadosExtraidosJson: JSON.stringify({ dias: [{ data: '2026-08-05' }] }),
      });
    expect(criarRes.status).toBe(201);

    const confirmarRes = await request(app.getHttpServer())
      .post(`/extracoes-pendentes/${criarRes.body.id}/confirmar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ registros: [{ dataHora: '2026-08-05T07:58:00', tipo: 'ENTRADA_1' }] });
    expect(confirmarRes.status).toBe(201);

    const prisma = app.get(PrismaService);
    const criado = await prisma.registroPonto.findFirst({
      where: { colaboradorId, dataHora: { gte: new Date('2026-08-05T00:00:00Z'), lt: new Date('2026-08-06T00:00:00Z') } },
    });
    expect(criado?.dataHora.toISOString()).toBe('2026-08-05T07:58:00.000Z');
  });
});
