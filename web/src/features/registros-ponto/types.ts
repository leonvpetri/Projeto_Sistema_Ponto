export type TipoRegistro = 'ENTRADA_1' | 'SAIDA_1' | 'ENTRADA_2' | 'SAIDA_2'

export interface RegistroPonto {
  id: string
  colaboradorId: string
  dataHora: string
  tipo: TipoRegistro
  origem: string
}

export interface CreateRegistroPontoInput {
  colaboradorId: string
  dataHora: string
  tipo: TipoRegistro
  origem?: string
}

export const TIPO_REGISTRO_LABEL: Record<TipoRegistro, string> = {
  ENTRADA_1: 'Entrada 1',
  SAIDA_1: 'Saída 1',
  ENTRADA_2: 'Entrada 2',
  SAIDA_2: 'Saída 2',
}

export interface DiaExtraidoFoto {
  dia: string // número do dia como veio do cartão, ex.: "1", "21"
  entrada1: string | null
  saida1: string | null
  entrada2: string | null
  saida2: string | null
  observacao: string | null
}

export interface ExtracaoFotoResultado {
  nome: string | null
  cpf: string | null
  mesReferencia: string | null // "YYYY-MM"
  dias: DiaExtraidoFoto[]
}
