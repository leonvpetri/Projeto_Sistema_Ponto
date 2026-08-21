import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useColaboradores } from '@/features/colaboradores/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { useCreateTrocaEscala } from '../hooks'
import { trocaEscalaSchema, type TrocaEscalaFormValues } from '../schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function TrocaEscalaForm({ onSaved }: { onSaved: () => void }) {
  const { data: colaboradores = [] } = useColaboradores()
  const { user } = useAuth()
  const createTrocaEscala = useCreateTrocaEscala()

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TrocaEscalaFormValues>({
    resolver: zodResolver(trocaEscalaSchema),
    defaultValues: {
      data: hojeISO(),
      colaboradorOriginalId: '',
      colaboradorSubstitutoId: '',
      motivo: '',
      supervisorInformado: '',
      registradoPor: user?.email ?? '',
      confirmadoPeloRH: false,
    },
  })

  async function onSubmit(values: TrocaEscalaFormValues) {
    await createTrocaEscala.mutateAsync({
      ...values,
      motivo: values.motivo || undefined,
    })
    toast.success('Troca de escala registrada.')
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="data">Data</FieldLabel>
          <Input id="data" type="date" {...register('data')} />
          <FieldError errors={[errors.data]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="colaboradorOriginalId">Colaborador original</FieldLabel>
          <Controller
            control={control}
            name="colaboradorOriginalId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="colaboradorOriginalId" className="w-full">
                  <SelectValue placeholder="Quem deveria trabalhar">
                    {(value: string) => colaboradores.find((c) => c.id === value)?.nome ?? 'Quem deveria trabalhar'}
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
          <FieldError errors={[errors.colaboradorOriginalId]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="colaboradorSubstitutoId">Colaborador substituto</FieldLabel>
          <Controller
            control={control}
            name="colaboradorSubstitutoId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="colaboradorSubstitutoId" className="w-full">
                  <SelectValue placeholder="Quem foi no lugar">
                    {(value: string) => colaboradores.find((c) => c.id === value)?.nome ?? 'Quem foi no lugar'}
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
          <FieldError errors={[errors.colaboradorSubstitutoId]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="supervisorInformado">Supervisor informado</FieldLabel>
          <Input id="supervisorInformado" {...register('supervisorInformado')} />
          <FieldError errors={[errors.supervisorInformado]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="registradoPor">Registrado por</FieldLabel>
          <Input id="registradoPor" {...register('registradoPor')} />
          <FieldError errors={[errors.registradoPor]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="motivo">Motivo (opcional)</FieldLabel>
          <Textarea id="motivo" {...register('motivo')} />
        </Field>

        <Field orientation="horizontal">
          <Controller
            control={control}
            name="confirmadoPeloRH"
            render={({ field }) => (
              <Switch id="confirmadoPeloRH" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <FieldLabel htmlFor="confirmadoPeloRH">Já confirmado pelo RH</FieldLabel>
        </Field>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Registrar troca'}
        </Button>
      </FieldGroup>
    </form>
  )
}
