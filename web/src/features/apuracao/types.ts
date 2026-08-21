export type StatusApuracao = 'OK' | 'ATRASO' | 'HORA_EXTRA' | 'FALTA' | 'FOLGA' | 'INCONSISTENTE'

export interface ApuracaoResultado {
  colaboradorId: string
  data: string
  diaEsperadoTrabalho: boolean
  totalTrabalhadoMin: number | null
  totalNoturnoMin: number | null
  totalNoturnoEquivalenteMin: number | null
  cargaEsperadaMin: number
  diferencaBancoHorasMin: number | null
  status: StatusApuracao
  alertas: string[]
}

export interface Pendencia {
  colaboradorId: string
  colaboradorNome: string
  data: string
  status: StatusApuracao
  alertas: string[]
}

export const STATUS_LABEL: Record<StatusApuracao, string> = {
  OK: 'OK',
  ATRASO: 'Atraso',
  HORA_EXTRA: 'Hora extra',
  FALTA: 'Falta',
  FOLGA: 'Folga',
  INCONSISTENTE: 'Inconsistente',
}
