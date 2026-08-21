import type { Colaborador } from '@/features/colaboradores/types'

export type StatusExtracao = 'PENDENTE' | 'CONFIRMADA' | 'REJEITADA' | 'SEM_IDENTIFICACAO'

export interface ExtracaoPendente {
  id: string
  telefoneOrigem: string
  colaboradorId: string | null
  colaborador: Colaborador | null
  nomeExtraidoCartao: string | null
  cpfExtraidoCartao: string | null
  conferenciaOk: boolean | null
  fotoUrl: string
  dadosExtraidosJson: string
  dadosExtraidos: unknown
  status: StatusExtracao
  revisadoPor: string | null
  revisadoEm: string | null
  motivoRejeicao: string | null
  criadoEm: string
}

export interface ConfirmarExtracaoInput {
  registros: { dataHora: string; tipo: string }[]
  observacoes?: { data: string; texto: string }[]
}
