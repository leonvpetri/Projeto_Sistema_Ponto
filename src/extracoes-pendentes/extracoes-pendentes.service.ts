import { Injectable } from '@nestjs/common';
import { Colaborador, StatusExtracao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarExtracaoPendenteDto } from './dto/criar-extracao-pendente.dto';

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
