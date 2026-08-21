import { z } from 'zod'

const optionalInt = z
  .string()
  .optional()
  .refine((v) => !v || /^\d+$/.test(v), { message: 'Informe um número inteiro' })

export const jornadaSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  tipo: z.enum(['PADRAO_5X2', 'COMPENSADO_SABADO', 'ESCALA_12X36', 'PERSONALIZADA']),
  horaEntradaPadrao: z.string().optional(),
  horaSaidaPadrao: z.string().optional(),
  duracaoIntervaloMin: optionalInt,
  toleranciaIntervaloMin: optionalInt,
  cargaDiariaEsperadaMin: optionalInt,
  cargaTurno12x36Min: optionalInt,
  temAdicionalNoturno: z.boolean(),
  horarioNoturnoInicio: z.string().optional(),
  horarioNoturnoFim: z.string().optional(),
  percentualAdicionalNoturno: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 1), {
      message: 'Informe um valor entre 0 e 1 (ex.: 0.2 para 20%)',
    }),
  horaNoturnaReduzida: z.boolean(),
  toleranciaBancoHorasMin: optionalInt,
})

export type JornadaFormValues = z.infer<typeof jornadaSchema>

export function jornadaFormToInput(values: JornadaFormValues) {
  return {
    nome: values.nome,
    tipo: values.tipo,
    horaEntradaPadrao: values.horaEntradaPadrao || undefined,
    horaSaidaPadrao: values.horaSaidaPadrao || undefined,
    duracaoIntervaloMin: values.duracaoIntervaloMin ? Number(values.duracaoIntervaloMin) : undefined,
    toleranciaIntervaloMin: values.toleranciaIntervaloMin ? Number(values.toleranciaIntervaloMin) : undefined,
    cargaDiariaEsperadaMin: values.cargaDiariaEsperadaMin ? Number(values.cargaDiariaEsperadaMin) : undefined,
    cargaTurno12x36Min: values.cargaTurno12x36Min ? Number(values.cargaTurno12x36Min) : undefined,
    temAdicionalNoturno: values.temAdicionalNoturno,
    horarioNoturnoInicio: values.horarioNoturnoInicio || undefined,
    horarioNoturnoFim: values.horarioNoturnoFim || undefined,
    percentualAdicionalNoturno: values.percentualAdicionalNoturno ? Number(values.percentualAdicionalNoturno) : undefined,
    horaNoturnaReduzida: values.horaNoturnaReduzida,
    toleranciaBancoHorasMin: values.toleranciaBancoHorasMin ? Number(values.toleranciaBancoHorasMin) : undefined,
  }
}
