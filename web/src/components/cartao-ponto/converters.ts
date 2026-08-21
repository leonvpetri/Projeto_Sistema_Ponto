import type { TipoRegistro } from '@/features/registros-ponto/types'

/** Um dia da tabela editável do cartão de ponto (foto manual ou Fila do WhatsApp). */
export interface DiaExtraido {
  dia: string // "YYYY-MM-DD"
  entrada1: string | null
  saida1: string | null
  entrada2: string | null
  saida2: string | null
  observacao: string | null
}

export interface RegistroConvertido {
  dataHora: string
  tipo: TipoRegistro
}

export interface ObservacaoConvertida {
  data: string
  texto: string
}

const CAMPO_PARA_TIPO: Record<'entrada1' | 'saida1' | 'entrada2' | 'saida2', TipoRegistro> = {
  entrada1: 'ENTRADA_1',
  saida1: 'SAIDA_1',
  entrada2: 'ENTRADA_2',
  saida2: 'SAIDA_2',
}

/** Converte os dias editados em batidas — só os campos preenchidos viram RegistroPonto. */
export function diasParaRegistros(dias: DiaExtraido[]): RegistroConvertido[] {
  const registros: RegistroConvertido[] = []
  for (const dia of dias) {
    for (const campo of ['entrada1', 'saida1', 'entrada2', 'saida2'] as const) {
      const horario = dia[campo]
      if (horario) registros.push({ dataHora: `${dia.dia}T${horario}:00`, tipo: CAMPO_PARA_TIPO[campo] })
    }
  }
  return registros
}

/** Só os dias com observação preenchida viram ObservacaoDia. */
export function diasParaObservacoes(dias: DiaExtraido[]): ObservacaoConvertida[] {
  return dias
    .filter((dia) => dia.observacao && dia.observacao.trim().length > 0)
    .map((dia) => ({ data: dia.dia, texto: (dia.observacao as string).trim() }))
}

/** Combina o número do dia (como a extração lê do cartão, ex.: "21") com o mês de referência em "YYYY-MM-DD". */
export function diaNumeroParaISO(diaNumero: string, mesReferencia: string | null): string {
  const mes = mesReferencia ?? new Date().toISOString().slice(0, 7)
  return `${mes}-${diaNumero.padStart(2, '0')}`
}
