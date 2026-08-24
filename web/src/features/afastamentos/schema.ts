import { z } from 'zod'
import { TIPOS_COM_MOTIVO_OBRIGATORIO } from './types'

export const afastamentoSchema = z
  .object({
    colaboradorId: z.string().min(1, 'Selecione o colaborador'),
    dataInicio: z.string().min(1, 'Selecione a data de início'),
    dataFim: z.string().min(1, 'Selecione a data de fim'),
    tipo: z.enum([
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
      'FOLGA_COMPENSATORIA',
      'TREINAMENTO_CORPORATIVO',
      'MOTIVO_PESSOAL',
      'PROBLEMA_TRANSPORTE',
      'TRANSITO',
      'PROBLEMA_CLIMATICO',
      'OUTRO',
    ]),
    abonado: z.boolean(),
    motivo: z.string().optional(),
    registradoPor: z.string().min(1, 'Informe quem está registrando'),
  })
  .refine((values) => values.dataFim >= values.dataInicio, {
    message: 'A data de fim não pode ser antes da data de início',
    path: ['dataFim'],
  })
  .refine((values) => !TIPOS_COM_MOTIVO_OBRIGATORIO.includes(values.tipo) || !!values.motivo?.trim(), {
    message: 'Motivo é obrigatório para este tipo de afastamento',
    path: ['motivo'],
  })

export type AfastamentoFormValues = z.infer<typeof afastamentoSchema>
