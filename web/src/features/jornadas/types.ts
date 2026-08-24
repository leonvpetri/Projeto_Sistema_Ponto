export type TipoEscala = 'PADRAO_5X2' | 'ESCALA_12X36' | 'PERSONALIZADA'

export interface Jornada {
  id: string
  nome: string
  tipo: TipoEscala
  horaEntradaPadrao: string | null
  horaSaidaPadrao: string | null
  duracaoIntervaloMin: number | null
  toleranciaIntervaloMin: number | null
  cargaDiariaEsperadaMin: number | null
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
  temAdicionalNoturno?: boolean
  horarioNoturnoInicio?: string
  horarioNoturnoFim?: string
  percentualAdicionalNoturno?: number
  horaNoturnaReduzida?: boolean
  toleranciaBancoHorasMin?: number
}

export const TIPO_ESCALA_LABEL: Record<TipoEscala, string> = {
  PADRAO_5X2: 'Padrão 5x2',
  ESCALA_12X36: '12x36',
  PERSONALIZADA: 'Personalizada',
}

// (saída - entrada) - intervalo, em minutos. Trata virada de dia: se a saída
// for <= entrada (ex.: 19:00 -> 08:00, caso comum do 12x36 noturno), soma 24h.
export function calcularCargaDiariaEsperadaMin(
  horaEntrada: string | undefined,
  horaSaida: string | undefined,
  duracaoIntervaloMin: number | undefined,
): number | null {
  if (!horaEntrada || !horaSaida) return null

  const [hEntrada, mEntrada] = horaEntrada.split(':').map(Number)
  const [hSaida, mSaida] = horaSaida.split(':').map(Number)
  if ([hEntrada, mEntrada, hSaida, mSaida].some(Number.isNaN)) return null

  const entradaMin = hEntrada * 60 + mEntrada
  let saidaMin = hSaida * 60 + mSaida
  if (saidaMin <= entradaMin) saidaMin += 24 * 60

  return saidaMin - entradaMin - (duracaoIntervaloMin ?? 0)
}
