import { z } from 'zod'

export const trocaEscalaSchema = z
  .object({
    data: z.string().min(1, 'Selecione a data'),
    colaboradorOriginalId: z.string().min(1, 'Selecione o colaborador original'),
    colaboradorSubstitutoId: z.string().min(1, 'Selecione o colaborador substituto'),
    motivo: z.string().optional(),
    supervisorInformado: z.string().min(1, 'Informe o supervisor'),
    registradoPor: z.string().min(1, 'Informe quem está registrando'),
    confirmadoPeloRH: z.boolean(),
  })
  .refine((values) => values.colaboradorOriginalId !== values.colaboradorSubstitutoId, {
    message: 'Selecione dois colaboradores diferentes',
    path: ['colaboradorSubstitutoId'],
  })

export type TrocaEscalaFormValues = z.infer<typeof trocaEscalaSchema>
