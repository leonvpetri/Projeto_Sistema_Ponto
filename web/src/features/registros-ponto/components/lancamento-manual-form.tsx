import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useColaboradores } from '@/features/colaboradores/hooks'
import { useCreateRegistroPonto, useRegistrosPontoDoDia, useSubstituirRegistrosDoDia } from '../hooks'
import { TIPO_REGISTRO_LABEL, type TipoRegistro } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const horaVaziaOuValida = z
  .string()
  .optional()
  .refine((v) => !v || /^\d{2}:\d{2}$/.test(v), { message: 'Horário inválido' })

const lancamentoSchema = z
  .object({
    colaboradorId: z.string().min(1, 'Selecione um colaborador'),
    data: z.string().min(1, 'Selecione a data'),
    entrada1: horaVaziaOuValida,
    saida1: horaVaziaOuValida,
    entrada2: horaVaziaOuValida,
    saida2: horaVaziaOuValida,
  })
  .refine((values) => values.entrada1 || values.saida1 || values.entrada2 || values.saida2, {
    message: 'Preencha ao menos um horário',
    path: ['entrada1'],
  })

type LancamentoFormValues = z.infer<typeof lancamentoSchema>

const CAMPO_PARA_TIPO: Record<'entrada1' | 'saida1' | 'entrada2' | 'saida2', TipoRegistro> = {
  entrada1: 'ENTRADA_1',
  saida1: 'SAIDA_1',
  entrada2: 'ENTRADA_2',
  saida2: 'SAIDA_2',
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function LancamentoManualForm() {
  const { data: colaboradores = [] } = useColaboradores()
  const colaboradoresAtivos = colaboradores.filter((c) => c.ativo)
  const createRegistroPonto = useCreateRegistroPonto()
  const substituirRegistrosDoDia = useSubstituirRegistrosDoDia()

  const {
    control,
    register,
    handleSubmit,
    watch,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: { colaboradorId: '', data: hojeISO(), entrada1: '', saida1: '', entrada2: '', saida2: '' },
  })

  const colaboradorId = watch('colaboradorId')
  const data = watch('data')
  const { data: registrosDoDia = [] } = useRegistrosPontoDoDia(colaboradorId || undefined, data || undefined)
  const [resultado, setResultado] = useState<{ salvos: number; falhas: string[] } | null>(null)

  const tiposJaLancados = new Set(registrosDoDia.map((r) => r.tipo))

  async function onSubmit(values: LancamentoFormValues) {
    setResultado(null)
    const campos = ['entrada1', 'saida1', 'entrada2', 'saida2'] as const
    const preenchidos = campos.filter((campo) => values[campo])

    // Dia já tem lançamento: edita substituindo o dia inteiro (apagar+recriar
    // no backend), pra não duplicar RegistroPonto. Preserva os tipos que já
    // existiam e não foram tocados neste envio.
    if (registrosDoDia.length > 0) {
      const porTipo = new Map(registrosDoDia.map((registro) => [registro.tipo, registro]))
      const registrosFinais = campos
        .map((campo) => {
          const tipo = CAMPO_PARA_TIPO[campo]
          if (values[campo]) {
            return { dataHora: `${values.data}T${values[campo]}:00`, tipo, origem: 'CARTAO_MECANICO' }
          }
          const existente = porTipo.get(tipo)
          return existente ? { dataHora: existente.dataHora, tipo, origem: existente.origem } : null
        })
        .filter((registro): registro is NonNullable<typeof registro> => registro !== null)

      try {
        await substituirRegistrosDoDia.mutateAsync({
          colaboradorId: values.colaboradorId,
          data: values.data,
          registros: registrosFinais,
        })
        preenchidos.forEach((campo) => resetField(campo, { defaultValue: '' }))
        setResultado({ salvos: preenchidos.length, falhas: [] })
        toast.success(`${preenchidos.length} lançamento(s) salvo(s).`)
      } catch {
        setResultado({ salvos: 0, falhas: preenchidos.map((campo) => TIPO_REGISTRO_LABEL[CAMPO_PARA_TIPO[campo]]) })
        toast.error('Falha ao salvar os lançamentos.')
      }
      return
    }

    const resultados = await Promise.allSettled(
      preenchidos.map((campo) =>
        createRegistroPonto.mutateAsync({
          colaboradorId: values.colaboradorId,
          dataHora: `${values.data}T${values[campo]}:00`,
          tipo: CAMPO_PARA_TIPO[campo],
          origem: 'CARTAO_MECANICO',
        }),
      ),
    )

    const falhas: string[] = []
    resultados.forEach((r, index) => {
      const campo = preenchidos[index]
      if (r.status === 'fulfilled') {
        resetField(campo, { defaultValue: '' })
      } else {
        falhas.push(TIPO_REGISTRO_LABEL[CAMPO_PARA_TIPO[campo]])
      }
    })

    const salvos = preenchidos.length - falhas.length
    setResultado({ salvos, falhas })
    if (salvos > 0) toast.success(`${salvos} lançamento(s) salvo(s).`)
    if (falhas.length > 0) toast.error(`Falha ao salvar: ${falhas.join(', ')}.`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="colaboradorId">Colaborador</FieldLabel>
          <Controller
            control={control}
            name="colaboradorId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="colaboradorId" className="w-full">
                  <SelectValue placeholder="Selecione um colaborador">
                    {(value: string) => colaboradoresAtivos.find((c) => c.id === value)?.nome ?? 'Selecione um colaborador'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {colaboradoresAtivos.map((colaborador) => (
                    <SelectItem key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.colaboradorId]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="data">Data</FieldLabel>
          <Input id="data" type="date" {...register('data')} />
          <FieldError errors={[errors.data]} />
        </Field>

        {registrosDoDia.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="mb-1.5 font-medium">Já lançado neste dia:</p>
            <div className="flex flex-wrap gap-1.5">
              {registrosDoDia.map((registro) => (
                <Badge key={registro.id} variant="secondary">
                  {TIPO_REGISTRO_LABEL[registro.tipo]} · {registro.dataHora.slice(11, 16)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {(['entrada1', 'saida1', 'entrada2', 'saida2'] as const).map((campo) => {
            const tipo = CAMPO_PARA_TIPO[campo]
            const jaLancado = tiposJaLancados.has(tipo)
            return (
              <Field key={campo}>
                <FieldLabel htmlFor={campo}>{TIPO_REGISTRO_LABEL[tipo]}</FieldLabel>
                <Input id={campo} type="time" {...register(campo)} />
                {jaLancado && (
                  <p className="text-xs text-amber-600">
                    Já existe um lançamento de {TIPO_REGISTRO_LABEL[tipo]} neste dia — preencher aqui substitui o
                    horário existente.
                  </p>
                )}
              </Field>
            )
          })}
        </div>
        <FieldError errors={[errors.entrada1]} />

        {resultado && resultado.falhas.length > 0 && (
          <p className="text-sm text-destructive">Não foi possível salvar: {resultado.falhas.join(', ')}.</p>
        )}

        <Button type="submit" disabled={isSubmitting || !colaboradorId}>
          {isSubmitting ? 'Salvando…' : 'Salvar lançamentos'}
        </Button>
      </FieldGroup>
    </form>
  )
}
