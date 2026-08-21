import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useColaboradores } from '@/features/colaboradores/hooks'
import { criarObservacaoDia } from '@/features/observacoes-dia/api'
import { useCreateRegistroPonto, useExtrairFoto } from '../hooks'
import { ApiError } from '@/lib/api-client'
import { DiaTableEditor } from '@/components/cartao-ponto/dia-table-editor'
import { diaNumeroParaISO, diasParaObservacoes, diasParaRegistros, type DiaExtraido } from '@/components/cartao-ponto/converters'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function LancamentoFotoForm() {
  const { data: colaboradores = [] } = useColaboradores()
  const colaboradoresAtivos = colaboradores.filter((c) => c.ativo)
  const extrairFoto = useExtrairFoto()
  const createRegistroPonto = useCreateRegistroPonto()

  const { control, watch } = useForm<{ colaboradorId: string }>({ defaultValues: { colaboradorId: '' } })
  const colaboradorId = watch('colaboradorId')

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [dica, setDica] = useState<{ nome: string | null; cpf: string | null } | null>(null)
  const [dias, setDias] = useState<DiaExtraido[] | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [resultado, setResultado] = useState<{ salvos: number; falhas: number } | null>(null)

  async function handleExtrair() {
    if (!arquivo) return
    setDias(null)
    setResultado(null)
    try {
      const extraido = await extrairFoto.mutateAsync(arquivo)
      setDica({ nome: extraido.nome, cpf: extraido.cpf })
      setDias(
        extraido.dias.map((dia) => ({
          dia: diaNumeroParaISO(dia.dia, extraido.mesReferencia),
          entrada1: dia.entrada1,
          saida1: dia.saida1,
          entrada2: dia.entrada2,
          saida2: dia.saida2,
          observacao: dia.observacao,
        })),
      )
    } catch (error) {
      const mensagem =
        error instanceof ApiError ? error.message : 'Não foi possível extrair os dados da foto. Tente novamente.'
      toast.error(mensagem)
    }
  }

  async function handleConfirmar() {
    if (!dias || !colaboradorId) return
    setConfirmando(true)
    setResultado(null)

    const registros = diasParaRegistros(dias)
    const observacoes = diasParaObservacoes(dias)

    const resultadosRegistros = await Promise.allSettled(
      registros.map((registro) => createRegistroPonto.mutateAsync({ colaboradorId, ...registro, origem: 'IMPORTACAO_FOTO' })),
    )
    const resultadosObservacoes = await Promise.allSettled(
      observacoes.map((observacao) => criarObservacaoDia({ colaboradorId, ...observacao })),
    )

    const falhas =
      resultadosRegistros.filter((r) => r.status === 'rejected').length +
      resultadosObservacoes.filter((r) => r.status === 'rejected').length
    const salvos = registros.length + observacoes.length - falhas

    setResultado({ salvos, falhas })
    setConfirmando(false)
    if (salvos > 0) toast.success(`${salvos} lançamento(s) salvo(s).`)
    if (falhas > 0) toast.error(`${falhas} item(ns) falharam ao salvar.`)
    if (falhas === 0) {
      setDias(null)
      setArquivo(null)
      setDica(null)
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Field>
        <FieldLabel htmlFor="foto-colaborador">Colaborador</FieldLabel>
        <Controller
          control={control}
          name="colaboradorId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="foto-colaborador" className="w-72">
                <SelectValue placeholder="Selecione um colaborador (obrigatório para confirmar)">
                  {(value: string) => colaboradoresAtivos.find((c) => c.id === value)?.nome ?? 'Selecione um colaborador'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {colaboradoresAtivos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="foto-arquivo">Foto do cartão de ponto</FieldLabel>
        <input
          id="foto-arquivo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </Field>

      <Button onClick={handleExtrair} disabled={!arquivo || extrairFoto.isPending}>
        {extrairFoto.isPending ? 'Extraindo…' : 'Extrair dados'}
      </Button>

      {dica && (dica.nome || dica.cpf) && (
        <p className="text-sm text-muted-foreground">
          Lido no cartão: {dica.nome ?? '—'} {dica.cpf ? `· CPF ${dica.cpf}` : ''} — confira se bate com o colaborador
          selecionado.
        </p>
      )}

      {dias && (
        <div className="space-y-3">
          <DiaTableEditor dias={dias} onChange={setDias} />
          {resultado && resultado.falhas > 0 && (
            <p className="text-sm text-destructive">{resultado.falhas} item(ns) não foram salvos — tente confirmar de novo.</p>
          )}
          <Button onClick={handleConfirmar} disabled={!colaboradorId || confirmando}>
            {confirmando ? 'Salvando…' : 'Confirmar e lançar'}
          </Button>
          {!colaboradorId && <p className="text-xs text-muted-foreground">Selecione um colaborador para confirmar.</p>}
        </div>
      )}
    </div>
  )
}
