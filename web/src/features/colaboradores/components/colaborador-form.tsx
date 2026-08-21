import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useJornadas } from '@/features/jornadas/hooks'
import { TIPO_ESCALA_LABEL } from '@/features/jornadas/types'
import { useCreateColaborador, useUpdateColaborador } from '../hooks'
import { createColaboradorSchema, type ColaboradorFormValues } from '../schema'
import type { Colaborador } from '../types'
import { ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ColaboradorFormProps {
  colaborador?: Colaborador
}

export function ColaboradorForm({ colaborador }: ColaboradorFormProps) {
  const navigate = useNavigate()
  const { data: jornadas = [] } = useJornadas()
  const createColaborador = useCreateColaborador()
  const updateColaborador = useUpdateColaborador()

  const {
    control,
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ColaboradorFormValues>({
    resolver: zodResolver(createColaboradorSchema(jornadas)),
    defaultValues: {
      nome: colaborador?.nome ?? '',
      cpf: colaborador?.cpf ?? '',
      setor: colaborador?.setor ?? '',
      jornadaId: colaborador?.jornadaId ?? '',
      telefone: colaborador?.telefone ?? '',
      ativo: colaborador?.ativo ?? true,
      dataBaseEscala12x36: colaborador?.dataBaseEscala12x36?.slice(0, 10) ?? '',
    },
  })

  const jornadaIdSelecionada = watch('jornadaId')
  const jornadaSelecionada = jornadas.find((j) => j.id === jornadaIdSelecionada)
  const precisaDataBase = jornadaSelecionada?.tipo === 'ESCALA_12X36'

  async function onSubmit(values: ColaboradorFormValues) {
    const input = {
      nome: values.nome,
      cpf: values.cpf,
      setor: values.setor,
      jornadaId: values.jornadaId,
      telefone: values.telefone || undefined,
      ativo: values.ativo,
      dataBaseEscala12x36: values.dataBaseEscala12x36 || undefined,
    }

    try {
      if (colaborador) {
        await updateColaborador.mutateAsync({ id: colaborador.id, input })
        toast.success('Colaborador atualizado.')
      } else {
        await createColaborador.mutateAsync(input)
        toast.success('Colaborador cadastrado.')
      }
      navigate('/colaboradores')
    } catch (error) {
      if (error instanceof ApiError && error.status >= 500) {
        setError('root', {
          message: 'Não foi possível salvar — verifique se o CPF ou telefone já não estão cadastrados para outro colaborador.',
        })
      } else if (error instanceof ApiError) {
        setError('root', { message: error.message })
      } else {
        setError('root', { message: 'Erro inesperado ao salvar.' })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nome">Nome</FieldLabel>
          <Input id="nome" {...register('nome')} />
          <FieldError errors={[errors.nome]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="cpf">CPF</FieldLabel>
          <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} />
          <FieldError errors={[errors.cpf]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="setor">Setor</FieldLabel>
          <Input id="setor" {...register('setor')} />
          <FieldError errors={[errors.setor]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="telefone">Telefone (WhatsApp)</FieldLabel>
          <Input id="telefone" placeholder="5534999999999" {...register('telefone')} />
          <FieldError errors={[errors.telefone]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="jornadaId">Jornada</FieldLabel>
          <Controller
            control={control}
            name="jornadaId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="jornadaId" className="w-full">
                  <SelectValue placeholder="Selecione uma jornada">
                    {(value: string) => {
                      const jornada = jornadas.find((j) => j.id === value)
                      return jornada ? `${jornada.nome} · ${TIPO_ESCALA_LABEL[jornada.tipo]}` : 'Selecione uma jornada'
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {jornadas.map((jornada) => (
                    <SelectItem key={jornada.id} value={jornada.id}>
                      {jornada.nome} · {TIPO_ESCALA_LABEL[jornada.tipo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.jornadaId]} />
        </Field>

        {precisaDataBase && (
          <Field>
            <FieldLabel htmlFor="dataBaseEscala12x36">Data-base da escala 12x36</FieldLabel>
            <Input id="dataBaseEscala12x36" type="date" {...register('dataBaseEscala12x36')} />
            <FieldError errors={[errors.dataBaseEscala12x36]} />
          </Field>
        )}

        {colaborador && (
          <Field orientation="horizontal">
            <Controller
              control={control}
              name="ativo"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} id="ativo" />}
            />
            <FieldLabel htmlFor="ativo">Ativo</FieldLabel>
          </Field>
        )}

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/colaboradores')}>
            Cancelar
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
