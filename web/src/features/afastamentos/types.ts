export type TipoAfastamento =
  | 'ATESTADO_MEDICO'
  | 'ATESTADO_ACOMPANHAMENTO'
  | 'LICENCA_NOJO'
  | 'LICENCA_GALA'
  | 'LICENCA_PATERNIDADE'
  | 'LICENCA_MATERNIDADE'
  | 'DOACAO_SANGUE'
  | 'CONVOCACAO_JUDICIAL'
  | 'SERVICO_ELEITORAL'
  | 'EXAME_PREVENTIVO'
  | 'DECLARACAO_COMPARECIMENTO'
  | 'FERIAS'
  | 'FOLGA_COMPENSATORIA'
  | 'TREINAMENTO_CORPORATIVO'
  | 'MOTIVO_PESSOAL'
  | 'PROBLEMA_TRANSPORTE'
  | 'TRANSITO'
  | 'PROBLEMA_CLIMATICO'
  | 'OUTRO'

export interface Afastamento {
  id: string
  colaboradorId: string
  dataInicio: string
  dataFim: string
  tipo: TipoAfastamento
  abonado: boolean
  motivo: string | null
  registradoPor: string
  criadoEm: string
  atualizadoEm: string
}

export interface CreateAfastamentoInput {
  colaboradorId: string
  dataInicio: string
  dataFim: string
  tipo: TipoAfastamento
  abonado: boolean
  motivo?: string
  registradoPor: string
}

export type UpdateAfastamentoInput = Partial<CreateAfastamentoInput>

export const TIPO_AFASTAMENTO_LABEL: Record<TipoAfastamento, string> = {
  ATESTADO_MEDICO: 'Atestado médico',
  ATESTADO_ACOMPANHAMENTO: 'Atestado de acompanhamento',
  LICENCA_NOJO: 'Licença nojo',
  LICENCA_GALA: 'Licença gala',
  LICENCA_PATERNIDADE: 'Licença paternidade',
  LICENCA_MATERNIDADE: 'Licença maternidade',
  DOACAO_SANGUE: 'Doação de sangue',
  CONVOCACAO_JUDICIAL: 'Convocação judicial',
  SERVICO_ELEITORAL: 'Serviço eleitoral',
  EXAME_PREVENTIVO: 'Exame preventivo',
  DECLARACAO_COMPARECIMENTO: 'Declaração de comparecimento',
  FERIAS: 'Férias',
  FOLGA_COMPENSATORIA: 'Folga compensatória',
  TREINAMENTO_CORPORATIVO: 'Treinamento corporativo',
  MOTIVO_PESSOAL: 'Motivo pessoal',
  PROBLEMA_TRANSPORTE: 'Problema de transporte',
  TRANSITO: 'Trânsito',
  PROBLEMA_CLIMATICO: 'Problema climático',
  OUTRO: 'Outro',
}

export const TIPO_AFASTAMENTO_GRUPOS: { label: string; tipos: TipoAfastamento[] }[] = [
  {
    label: 'Legais',
    tipos: [
      'ATESTADO_MEDICO',
      'ATESTADO_ACOMPANHAMENTO',
      'LICENCA_NOJO',
      'LICENCA_GALA',
      'LICENCA_PATERNIDADE',
      'LICENCA_MATERNIDADE',
      'DOACAO_SANGUE',
      'CONVOCACAO_JUDICIAL',
      'SERVICO_ELEITORAL',
      'EXAME_PREVENTIVO',
      'DECLARACAO_COMPARECIMENTO',
      'FERIAS',
    ],
  },
  {
    label: 'Administrativas/Internas',
    tipos: ['FOLGA_COMPENSATORIA', 'TREINAMENTO_CORPORATIVO'],
  },
  {
    label: 'Não abonadas',
    tipos: ['MOTIVO_PESSOAL', 'PROBLEMA_TRANSPORTE', 'TRANSITO', 'PROBLEMA_CLIMATICO', 'OUTRO'],
  },
]

/** Sugestão automática do campo `abonado` ao escolher o tipo — o RH pode mudar manualmente depois. `undefined` = sem sugestão (ex.: OUTRO). */
export const ABONADO_SUGERIDO: Partial<Record<TipoAfastamento, boolean>> = {
  ATESTADO_MEDICO: true,
  ATESTADO_ACOMPANHAMENTO: true,
  LICENCA_NOJO: true,
  LICENCA_GALA: true,
  LICENCA_PATERNIDADE: true,
  LICENCA_MATERNIDADE: true,
  DOACAO_SANGUE: true,
  CONVOCACAO_JUDICIAL: true,
  SERVICO_ELEITORAL: true,
  EXAME_PREVENTIVO: true,
  DECLARACAO_COMPARECIMENTO: true,
  FERIAS: true,
  FOLGA_COMPENSATORIA: true,
  TREINAMENTO_CORPORATIVO: true,
  MOTIVO_PESSOAL: false,
  PROBLEMA_TRANSPORTE: false,
  TRANSITO: false,
  PROBLEMA_CLIMATICO: false,
}

export const TIPOS_COM_MOTIVO_OBRIGATORIO: TipoAfastamento[] = ['OUTRO', 'MOTIVO_PESSOAL']
