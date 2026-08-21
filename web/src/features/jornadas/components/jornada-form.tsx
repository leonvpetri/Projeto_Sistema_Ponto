import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useCreateJornada, useUpdateJornada } from '../hooks'
import { jornadaFormToInput, jornadaSchema, type JornadaFormValues } from '../schema'
import { TIPO_ESCALA_LABEL, type Jornada } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface JornadaFormProps {
  jornada?: Jornada
  onSaved: () => void
}

export function JornadaForm({ jornada, onSaved }: JornadaFormProps) {
  const createJornada = useCreateJornada()
  const updateJornada = useUpdateJornada()

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JornadaFormValues>({
    resolver: zodResolver(jornadaSchema),
    defaultValues: {
      nome: jornada?.nome ?? '',
      tipo: jornada?.tipo ?? 'PADRAO_5X2',
      horaEntradaPadrao: jornada?.horaEntradaPadrao ?? '',
      horaSaidaPadrao: jornada?.horaSaidaPadrao ?? '',
      duracaoIntervaloMin: jornada?.duracaoIntervaloMin?.toString() ?? '',
      toleranciaIntervaloMin: jornada?.toleranciaIntervaloMin?.toString() ?? '10',
      cargaDiariaEsperadaMin: jornada?.cargaDiariaEsperadaMin?.toString() ?? '',
      cargaTurno12x36Min: jornada?.cargaTurno12x36Min?.toString() ?? '',
      temAdicionalNoturno: jornada?.temAdicionalNoturno ?? false,
      horarioNoturnoInicio: jornada?.horarioNoturnoInicio ?? '22:00',
      horarioNoturnoFim: jornada?.horarioNoturnoFim ?? '05:00',
      percentualAdicionalNoturno: jornada?.percentualAdicionalNoturno?.toString() ?? '0.2',
      horaNoturnaReduzida: jornada?.horaNoturnaReduzida ?? true,
      toleranciaBancoHorasMin: jornada?.toleranciaBancoHorasMin?.toString() ?? '10',
    },
  })

  const tipo = watch('tipo')
  const temAdicionalNoturno = watch('temAdicionalNoturno')

  async function onSubmit(values: JornadaFormValues) {
    const input = jornadaFormToInput(values)
    if (jornada) {
      await updateJornada.mutateAsync({ id: jornada.id, input })
      toast.success('Jornada atualizada.')
    } else {
      await createJornada.mutateAsync(input)
      toast.success('Jornada cadastrada.')
    }
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nome">Nome</FieldLabel>
          <Input id="nome" {...register('nome')} />
          <FieldError errors={[errors.nome]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="tipo">Tipo</FieldLabel>
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="tipo" className="w-full">
                  <SelectValue>{(value: keyof typeof TIPO_ESCALA_LABEL) => TIPO_ESCALA_LABEL[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_ESCALA_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {tipo !== 'ESCALA_12X36' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="horaEntradaPadrao">Entrada padrão</FieldLabel>
                <Input id="horaEntradaPadrao" type="time" {...register('horaEntradaPadrao')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="horaSaidaPadrao">Saída padrão</FieldLabel>
                <Input id="horaSaidaPadrao" type="time" {...register('horaSaidaPadrao')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="duracaoIntervaloMin">Duração do intervalo (min)</FieldLabel>
                <Input id="duracaoIntervaloMin" inputMode="numeric" {...register('duracaoIntervaloMin')} />
                <FieldError errors={[errors.duracaoIntervaloMin]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="toleranciaIntervaloMin">Tolerância do intervalo (min)</FieldLabel>
                <Input id="toleranciaIntervaloMin" inputMode="numeric" {...register('toleranciaIntervaloMin')} />
                <FieldError errors={[errors.toleranciaIntervaloMin]} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="cargaDiariaEsperadaMin">Carga diária esperada (min)</FieldLabel>
              <Input id="cargaDiariaEsperadaMin" inputMode="numeric" {...register('cargaDiariaEsperadaMin')} />
              <FieldError errors={[errors.cargaDiariaEsperadaMin]} />
            </Field>
          </>
        )}

        {tipo === 'ESCALA_12X36' && (
          <Field>
            <FieldLabel htmlFor="cargaTurno12x36Min">Carga do turno 12x36 (min)</FieldLabel>
            <Input id="cargaTurno12x36Min" inputMode="numeric" placeholder="720" {...register('cargaTurno12x36Min')} />
            <FieldError errors={[errors.cargaTurno12x36Min]} />
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="toleranciaBancoHorasMin">Tolerância banco de horas (min)</FieldLabel>
          <Input id="toleranciaBancoHorasMin" inputMode="numeric" {...register('toleranciaBancoHorasMin')} />
          <FieldError errors={[errors.toleranciaBancoHorasMin]} />
        </Field>

        <Field orientation="horizontal">
          <Controller
            control={control}
            name="temAdicionalNoturno"
            render={({ field }) => (
              <Switch id="temAdicionalNoturno" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <FieldLabel htmlFor="temAdicionalNoturno">Adicional noturno</FieldLabel>
        </Field>

        {temAdicionalNoturno && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="horarioNoturnoInicio">Início do noturno</FieldLabel>
                <Input id="horarioNoturnoInicio" type="time" {...register('horarioNoturnoInicio')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="horarioNoturnoFim">Fim do noturno</FieldLabel>
                <Input id="horarioNoturnoFim" type="time" {...register('horarioNoturnoFim')} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="percentualAdicionalNoturno">Percentual do adicional (ex.: 0.2 = 20%)</FieldLabel>
              <Input id="percentualAdicionalNoturno" {...register('percentualAdicionalNoturno')} />
              <FieldError errors={[errors.percentualAdicionalNoturno]} />
            </Field>
            <Field orientation="horizontal">
              <Controller
                control={control}
                name="horaNoturnaReduzida"
                render={({ field }) => (
                  <Switch id="horaNoturnaReduzida" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <FieldLabel htmlFor="horaNoturnaReduzida">Hora noturna reduzida (CLT Art. 73)</FieldLabel>
            </Field>
          </>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar'}
        </Button>
      </FieldGroup>
    </form>
  )
}
