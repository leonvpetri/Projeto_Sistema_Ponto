import { useState } from 'react'
import { toast } from 'sonner'
import { useColaboradores } from '@/features/colaboradores/hooks'
import { useConfirmarExtracao, useRejeitarExtracao, useVincularColaborador } from '../hooks'
import { parseDadosExtraidos } from '../parse-dados-extraidos'
import type { ExtracaoPendente } from '../types'
import { DiaTableEditor } from '@/components/cartao-ponto/dia-table-editor'
import { diasParaObservacoes, diasParaRegistros, type DiaExtraido } from '@/components/cartao-ponto/converters'
import { ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/ui/field'

interface ExtracaoDetailDialogProps {
  extracao: ExtracaoPendente
  onClose: () => void
}

export function ExtracaoDetailDialog({ extracao, onClose }: ExtracaoDetailDialogProps) {
  const { data: colaboradores = [] } = useColaboradores()
  const confirmarExtracao = useConfirmarExtracao()
  const rejeitarExtracao = useRejeitarExtracao()
  const vincularColaborador = useVincularColaborador()

  const [colaboradorEscolhido, setColaboradorEscolhido] = useState('')
  const [dias, setDias] = useState<DiaExtraido[] | null>(() => parseDadosExtraidos(extracao.dadosExtraidos))
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [mostrarRejeicao, setMostrarRejeicao] = useState(false)

  const precisaVincular = extracao.status === 'SEM_IDENTIFICACAO'
  const podeConfirmar = !precisaVincular || !!colaboradorEscolhido

  async function handleVincular() {
    if (!colaboradorEscolhido) return
    try {
      await vincularColaborador.mutateAsync({ id: extracao.id, colaboradorId: colaboradorEscolhido })
      toast.success('Colaborador vinculado.')
    } catch {
      toast.error('Não foi possível vincular o colaborador.')
    }
  }

  async function handleConfirmar() {
    if (!dias) return
    try {
      await confirmarExtracao.mutateAsync({
        id: extracao.id,
        input: { registros: diasParaRegistros(dias), observacoes: diasParaObservacoes(dias) },
      })
      toast.success('Extração confirmada e lançada.')
      onClose()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível confirmar a extração.')
    }
  }

  async function handleRejeitar() {
    if (!motivoRejeicao.trim()) return
    try {
      await rejeitarExtracao.mutateAsync({ id: extracao.id, motivoRejeicao: motivoRejeicao.trim() })
      toast.success('Extração rejeitada.')
      onClose()
    } catch {
      toast.error('Não foi possível rejeitar a extração.')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] sm:max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar extração — {extracao.colaborador?.nome ?? 'Não identificado'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {extracao.conferenciaOk === false && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              O telefone identificou {extracao.colaborador?.nome}, mas o nome/CPF do cartão fotografado não bate
              ({extracao.nomeExtraidoCartao ?? '—'} / {extracao.cpfExtraidoCartao ?? '—'}). Confira com atenção.
            </p>
          )}

          {precisaVincular && (
            <Field>
              <FieldLabel htmlFor="vincular-colaborador">
                Telefone não identificado — vincule manualmente o colaborador
              </FieldLabel>
              <div className="flex gap-2">
                <Select value={colaboradorEscolhido} onValueChange={(v) => setColaboradorEscolhido(v ?? '')}>
                  <SelectTrigger id="vincular-colaborador" className="w-72">
                    <SelectValue placeholder="Selecione um colaborador">
                      {(value: string) => colaboradores.find((c) => c.id === value)?.nome ?? 'Selecione um colaborador'}
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
                <Button
                  variant="outline"
                  onClick={handleVincular}
                  disabled={!colaboradorEscolhido || vincularColaborador.isPending}
                >
                  Vincular
                </Button>
              </div>
            </Field>
          )}

          {dias ? (
            <DiaTableEditor dias={dias} onChange={setDias} />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                Não consegui interpretar o JSON extraído no formato esperado — revise manualmente abaixo.
              </p>
              <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">
                {extracao.dadosExtraidosJson}
              </pre>
            </div>
          )}

          {!mostrarRejeicao ? (
            <div className="flex gap-2">
              <Button onClick={handleConfirmar} disabled={!podeConfirmar || !dias || confirmarExtracao.isPending}>
                {confirmarExtracao.isPending ? 'Confirmando…' : 'Confirmar e lançar'}
              </Button>
              <Button variant="outline" onClick={() => setMostrarRejeicao(true)}>
                Rejeitar
              </Button>
            </div>
          ) : (
            <Field>
              <FieldLabel htmlFor="motivo-rejeicao">Motivo da rejeição</FieldLabel>
              <Textarea
                id="motivo-rejeicao"
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                placeholder="Ex.: Foto ilegível, pessoa errada…"
              />
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  onClick={handleRejeitar}
                  disabled={!motivoRejeicao.trim() || rejeitarExtracao.isPending}
                >
                  Confirmar rejeição
                </Button>
                <Button variant="outline" onClick={() => setMostrarRejeicao(false)}>
                  Cancelar
                </Button>
              </div>
            </Field>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
