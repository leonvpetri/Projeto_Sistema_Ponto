import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Colaborador, Prisma, StatusExtracao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseDataISO } from '../apuracao/date-utils';
import { CriarExtracaoPendenteDto } from './dto/criar-extracao-pendente.dto';
import { ConfirmarExtracaoDto } from './dto/confirmar-extracao.dto';
import { RejeitarExtracaoDto } from './dto/rejeitar-extracao.dto';
import { VincularColaboradorDto } from './dto/vincular-colaborador.dto';

@Injectable()
export class ExtracoesPendentesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Recebe o resultado da extração via WhatsApp (n8n). Nunca cria
   * RegistroPonto diretamente — só enfileira para revisão do RH.
   */
  async criar(dto: CriarExtracaoPendenteDto) {
    const colaborador = await this.prisma.colaborador.findUnique({
      where: { telefone: dto.telefoneOrigem },
    });

    if (!colaborador) {
      return this.prisma.extracaoPendente.create({
        data: {
          telefoneOrigem: dto.telefoneOrigem,
          fotoUrl: dto.fotoUrl,
          nomeExtraidoCartao: dto.nomeExtraidoCartao,
          cpfExtraidoCartao: dto.cpfExtraidoCartao,
          dadosExtraidosJson: dto.dadosExtraidosJson,
          status: StatusExtracao.SEM_IDENTIFICACAO,
        },
      });
    }

    return this.prisma.extracaoPendente.create({
      data: {
        telefoneOrigem: dto.telefoneOrigem,
        colaboradorId: colaborador.id,
        fotoUrl: dto.fotoUrl,
        nomeExtraidoCartao: dto.nomeExtraidoCartao,
        cpfExtraidoCartao: dto.cpfExtraidoCartao,
        dadosExtraidosJson: dto.dadosExtraidosJson,
        conferenciaOk: conferenciaBate(colaborador, dto.nomeExtraidoCartao, dto.cpfExtraidoCartao),
        status: StatusExtracao.PENDENTE,
      },
    });
  }

  async listar(status?: StatusExtracao) {
    const extracoes = await this.prisma.extracaoPendente.findMany({
      where: status ? { status } : undefined,
      include: { colaborador: true },
      orderBy: { criadoEm: 'asc' },
    });

    return extracoes.map((extracao) => ({
      ...extracao,
      dadosExtraidos: JSON.parse(extracao.dadosExtraidosJson),
    }));
  }

  /**
   * Cria os RegistroPonto (mesma lógica do lançamento manual — origem
   * IMPORTACAO_FOTO) e marca a extração como CONFIRMADA. As batidas vêm do
   * corpo da requisição porque o RH pode ter corrigido o que a IA leu.
   */
  async confirmar(id: string, dto: ConfirmarExtracaoDto, revisadoPor: string) {
    const extracao = await this.buscarRevisavel(id);
    if (!extracao.colaboradorId) {
      throw new BadRequestException('Extração sem colaborador vinculado — use vincular-colaborador antes de confirmar.');
    }

    const colaboradorId = extracao.colaboradorId as string;
    const observacoesUpserts = (dto.observacoes ?? []).map((observacao) =>
      this.prisma.observacaoDia.upsert({
        where: { colaboradorId_data: { colaboradorId, data: parseDataISO(observacao.data) } },
        create: { colaboradorId, data: parseDataISO(observacao.data), texto: observacao.texto },
        update: { texto: observacao.texto },
      }),
    );

    const resultados = await this.prisma.$transaction([
      this.prisma.registroPonto.createMany({
        data: dto.registros.map((registro) => ({
          colaboradorId,
          dataHora: new Date(registro.dataHora),
          tipo: registro.tipo,
          origem: 'IMPORTACAO_FOTO',
        })),
      }),
      ...observacoesUpserts,
      this.prisma.extracaoPendente.update({
        where: { id },
        data: {
          status: StatusExtracao.CONFIRMADA,
          revisadoPor,
          revisadoEm: new Date(),
        },
      }),
    ] as Prisma.PrismaPromise<unknown>[]);

    return resultados[resultados.length - 1];
  }

  async rejeitar(id: string, dto: RejeitarExtracaoDto, revisadoPor: string) {
    await this.buscarRevisavel(id);

    return this.prisma.extracaoPendente.update({
      where: { id },
      data: {
        status: StatusExtracao.REJEITADA,
        motivoRejeicao: dto.motivoRejeicao,
        revisadoPor,
        revisadoEm: new Date(),
      },
    });
  }

  async vincularColaborador(id: string, dto: VincularColaboradorDto) {
    const extracao = await this.prisma.extracaoPendente.findUnique({ where: { id } });
    if (!extracao) throw new NotFoundException('Extração não encontrada.');
    if (extracao.status !== StatusExtracao.SEM_IDENTIFICACAO) {
      throw new ConflictException('Só é possível vincular colaborador em extrações SEM_IDENTIFICACAO.');
    }

    const colaborador = await this.prisma.colaborador.findUnique({ where: { id: dto.colaboradorId } });
    if (!colaborador) throw new NotFoundException('Colaborador não encontrado.');

    return this.prisma.extracaoPendente.update({
      where: { id },
      data: {
        colaboradorId: colaborador.id,
        conferenciaOk: conferenciaBate(colaborador, extracao.nomeExtraidoCartao ?? undefined, extracao.cpfExtraidoCartao ?? undefined),
        status: StatusExtracao.PENDENTE,
      },
    });
  }

  /** Busca uma extração garantindo que ainda não foi revisada (confirmar/rejeitar são ações finais). */
  private async buscarRevisavel(id: string) {
    const extracao = await this.prisma.extracaoPendente.findUnique({ where: { id } });
    if (!extracao) throw new NotFoundException('Extração não encontrada.');
    if (extracao.status === StatusExtracao.CONFIRMADA || extracao.status === StatusExtracao.REJEITADA) {
      throw new ConflictException(`Extração já foi revisada (status atual: ${extracao.status}).`);
    }
    return extracao;
  }
}

/**
 * Telefone já identificou o colaborador; aqui só confirmamos se o cartão
 * fotografado parece ser da mesma pessoa (nome e CPF batendo, ignorando
 * maiúsculas/acentos/espaços/pontuação). Se não bater, ainda associamos o
 * colaboradorId — é pendência para o RH olhar, não motivo pra rejeitar.
 */
function conferenciaBate(
  colaborador: Colaborador,
  nomeExtraido: string | undefined,
  cpfExtraido: string | undefined,
): boolean {
  if (!nomeExtraido || !cpfExtraido) return false;
  return (
    normalizarNome(nomeExtraido) === normalizarNome(colaborador.nome) &&
    normalizarCpf(cpfExtraido) === normalizarCpf(colaborador.cpf)
  );
}

function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}
