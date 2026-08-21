import { z } from 'zod'
import type { Jornada } from '@/features/jornadas/types'

export function createColaboradorSchema(jornadas: Jornada[]) {
  return z
    .object({
      nome: z.string().min(1, 'Informe o nome'),
      cpf: z.string().min(1, 'Informe o CPF'),
      setor: z.string().min(1, 'Informe o setor'),
      jornadaId: z.string().min(1, 'Selecione uma jornada'),
      telefone: z.string().optional().or(z.literal('')),
      ativo: z.boolean(),
      dataBaseEscala12x36: z.string().optional().or(z.literal('')),
    })
    .superRefine((values, ctx) => {
      const jornada = jornadas.find((j) => j.id === values.jornadaId)
      if (jornada?.tipo === 'ESCALA_12X36' && !values.dataBaseEscala12x36) {
        ctx.addIssue({
          code: 'custom',
          path: ['dataBaseEscala12x36'],
          message: 'Obrigatório para jornadas 12x36',
        })
      }
    })
}

export type ColaboradorFormValues = z.infer<ReturnType<typeof createColaboradorSchema>>
