import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useColaboradores } from '@/features/colaboradores/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { useCreateAfastamento, useUpdateAfastamento } from '../hooks'
import { afastamentoSchema, type AfastamentoFormValues } from '../schema'
import {
  ABONADO_SUGERIDO,
  TIPOS_COM_MOTIVO_OBRIGATORIO,
  TIPO_AFASTAMENTO_GRUPOS,
  TIPO_AFASTAMENTO_LABEL,
  type Afastamento,
  type TipoAfastamento,
} from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AfastamentoFormProps {
  afastamento?: Afastamento
  onSaved: () => void
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function AfastamentoForm({ afastamento, onSaved }: AfastamentoFormProps) {
  const { data: colaboradores = [] } = useColaboradores()
  const { user } = useAuth()
  const createAfastamento = useCreateAfastamento()
  const updateAfastamento = useUpdateAfastamento()

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AfastamentoFormValues>({
    resolver: zodResolver(afastamentoSchema),
    defaultValues: {
      colaboradorId: afastamento?.colaboradorId ?? '',
      dataInicio: afastamento?.dataInicio.slice(0, 10) ?? hojeISO(),
      dataFim: afastamento?.dataFim.slice(0, 10) ?? hojeISO(),
      tipo: afastamento?.tipo ?? 'ATESTADO_MEDICO',
      abonado: afastamento?.abonado ?? true,
      motivo: afastamento?.motivo ?? '',
      registradoPor: afastamento?.registradoPor ?? user?.email ?? '',
    },
  })

  const tipo = watch('tipo')
  const motivoObrigatorio = TIPOS_COM_MOTIVO_OBRIGATORIO.includes(tipo)

  async function onSubmit(values: AfastamentoFormValues) {
    const input = { ...values, motivo: values.motivo || undefined }
    if (afastamento) {
      await updateAfastamento.mutateAsync({ id: afastamento.id, input })
      toast.success('Afastamento atualizado.')
    } else {
      await createAfastamento.mutateAsync(input)
      toast.success('Afastamento registrado.')
    }
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="colaboradorId">Colaborador</FieldLabel>
          <Controller
            control={control}
            name="colaboradorId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="colaboradorId" className="w-full">
                  <SelectValue placeholder="Selecione o colaborador">
                    {(value: string) => colaboradores.find((c) => c.id === value)?.nome ?? 'Selecione o colaborador'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.colaboradorId]} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="dataInicio">Data início</FieldLabel>
            <Input id="dataInicio" type="date" {...register('dataInicio')} />
            <FieldError errors={[errors.dataInicio]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="dataFim">Data fim</FieldLabel>
            <Input id="dataFim" type="date" {...register('dataFim')} />
            <FieldError errors={[errors.dataFim]} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="tipo">Tipo</FieldLabel>
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value: TipoAfastamento | null) => {
                  if (!value) return
                  field.onChange(value)
                  const sugestao = ABONADO_SUGERIDO[value]
                  if (sugestao !== undefined) setValue('abonado', sugestao)
                }}
              >
                <SelectTrigger id="tipo" className="w-full">
                  <SelectValue>{(value: TipoAfastamento) => TIPO_AFASTAMENTO_LABEL[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIPO_AFASTAMENTO_GRUPOS.map((grupo) => (
                    <SelectGroup key={grupo.label}>
                      <SelectLabel>{grupo.label}</SelectLabel>
                      {grupo.tipos.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_AFASTAMENTO_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.tipo]} />
        </Field>

        <Field orientation="horizontal">
          <Controller
            control={control}
            name="abonado"
            render={({ field }) => <Switch id="abonado" checked={field.value} onCheckedChange={field.onChange} />}
          />
          <FieldLabel htmlFor="abonado">Abonado</FieldLabel>
        </Field>

        <Field>
          <FieldLabel htmlFor="motivo">Motivo{motivoObrigatorio ? ' (obrigatório para este tipo)' : ' (opcional)'}</FieldLabel>
          <Textarea id="motivo" {...register('motivo')} />
          <FieldError errors={[errors.motivo]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="registradoPor">Registrado por</FieldLabel>
          <Input id="registradoPor" {...register('registradoPor')} />
          <FieldError errors={[errors.registradoPor]} />
        </Field>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : afastamento ? 'Salvar alterações' : 'Registrar afastamento'}
        </Button>
      </FieldGroup>
    </form>
  )
}
