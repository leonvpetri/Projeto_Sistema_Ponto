export type TipoEscala = 'PADRAO_5X2' | 'COMPENSADO_SABADO' | 'ESCALA_12X36' | 'PERSONALIZADA'

export interface Jornada {
  id: string
  nome: string
  tipo: TipoEscala
  horaEntradaPadrao: string | null
  horaSaidaPadrao: string | null
  duracaoIntervaloMin: number | null
  toleranciaIntervaloMin: number | null
  cargaDiariaEsperadaMin: number | null
  cargaTurno12x36Min: number | null
  temAdicionalNoturno: boolean
  horarioNoturnoInicio: string
  horarioNoturnoFim: string
  percentualAdicionalNoturno: number
  horaNoturnaReduzida: boolean
  toleranciaBancoHorasMin: number
}

export interface CreateJornadaInput {
  nome: string
  tipo: TipoEscala
  horaEntradaPadrao?: string
  horaSaidaPadrao?: string
  duracaoIntervaloMin?: number
  toleranciaIntervaloMin?: number
  cargaDiariaEsperadaMin?: number
  cargaTurno12x36Min?: number
  temAdicionalNoturno?: boolean
  horarioNoturnoInicio?: string
  horarioNoturnoFim?: string
  percentualAdicionalNoturno?: number
  horaNoturnaReduzida?: boolean
  toleranciaBancoHorasMin?: number
}

export const TIPO_ESCALA_LABEL: Record<TipoEscala, string> = {
  PADRAO_5X2: 'Padrão 5x2',
  COMPENSADO_SABADO: 'Compensado sábado',
  ESCALA_12X36: '12x36',
  PERSONALIZADA: 'Personalizada',
}
