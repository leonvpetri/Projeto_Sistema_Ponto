import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useColaboradores } from '@/features/colaboradores/hooks'
import { useAfastamentos, useDeleteAfastamento } from '../hooks'
import { AfastamentoForm } from '../components/afastamento-form'
import { TIPO_AFASTAMENTO_LABEL, type Afastamento } from '../types'
import { ApiError } from '@/lib/api-client'
import { PermissionDenied } from '@/components/layout/permission-denied'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/ui/field'

function mesAtualISO() {
  return new Date().toISOString().slice(0, 7)
}

export function AfastamentosPage() {
  const [mes, setMes] = useState(mesAtualISO())
  const [colaboradorId, setColaboradorId] = useState('')
  const [emEdicao, setEmEdicao] = useState<Afastamento | 'novo' | null>(null)

  const { data: colaboradores = [] } = useColaboradores()
  const { data: afastamentos, isLoading, error } = useAfastamentos(colaboradorId || undefined, mes)
  const deleteAfastamento = useDeleteAfastamento()

  const nomePorId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c.nome])), [colaboradores])

  if (error instanceof ApiError && error.status === 403) return <PermissionDenied />

  async function handleRemover(afastamento: Afastamento) {
    if (!window.confirm(`Remover o afastamento de ${nomePorId.get(afastamento.colaboradorId) ?? afastamento.colaboradorId}?`)) {
      return
    }
    try {
      await deleteAfastamento.mutateAsync(afastamento.id)
      toast.success('Afastamento removido.')
    } catch {
      toast.error('Não foi possível remover o afastamento.')
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Afastamentos</h1>
        <Button onClick={() => setEmEdicao('novo')}>Novo afastamento</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Field>
          <FieldLabel htmlFor="afastamentos-colaborador">Colaborador</FieldLabel>
          <Select value={colaboradorId} onValueChange={(value) => setColaboradorId(value ?? '')}>
            <SelectTrigger id="afastamentos-colaborador" className="w-64">
              <SelectValue placeholder="Todos os colaboradores">
                {(value: string) => colaboradores.find((c) => c.id === value)?.nome ?? 'Todos os colaboradores'}
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
        </Field>
        <Field>
          <FieldLabel htmlFor="afastamentos-mes">Mês</FieldLabel>
          <Input id="afastamentos-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-fit" />
        </Field>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Abonado</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(afastamentos ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell>{nomePorId.get(a.colaboradorId) ?? a.colaboradorId}</TableCell>
                <TableCell>
                  {a.dataInicio.slice(0, 10)} – {a.dataFim.slice(0, 10)}
                </TableCell>
                <TableCell>{TIPO_AFASTAMENTO_LABEL[a.tipo]}</TableCell>
                <TableCell>
                  <Badge variant={a.abonado ? 'default' : 'secondary'}>{a.abonado ? 'Abonado' : 'Não abonado'}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.motivo ?? '—'}</TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEmEdicao(a)}>
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleRemover(a)}>
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(afastamentos ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Nenhum afastamento neste mês.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={emEdicao !== null} onOpenChange={(open) => !open && setEmEdicao(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{emEdicao === 'novo' ? 'Novo afastamento' : 'Editar afastamento'}</DialogTitle>
          </DialogHeader>
          <AfastamentoForm
            afastamento={emEdicao !== 'novo' ? (emEdicao ?? undefined) : undefined}
            onSaved={() => setEmEdicao(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
