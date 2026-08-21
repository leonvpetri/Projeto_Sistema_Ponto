import { useMemo, useState } from 'react'
import { useColaboradores } from '@/features/colaboradores/hooks'
import { useTrocasEscalaDoMes } from '../hooks'
import { TrocaEscalaForm } from '../components/troca-escala-form'
import { ApiError } from '@/lib/api-client'
import { PermissionDenied } from '@/components/layout/permission-denied'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function mesAtualISO() {
  return new Date().toISOString().slice(0, 7)
}

export function TrocasEscalaPage() {
  const [mes, setMes] = useState(mesAtualISO())
  const [dialogAberto, setDialogAberto] = useState(false)
  const { data: trocas, isLoading, error } = useTrocasEscalaDoMes(mes)
  const { data: colaboradores = [] } = useColaboradores()

  const nomePorId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c.nome])), [colaboradores])

  if (error instanceof ApiError && error.status === 403) return <PermissionDenied />

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Trocas de Escala</h1>
        <Button onClick={() => setDialogAberto(true)}>Nova troca</Button>
      </div>

      <div className="mb-4">
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-fit" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Original → Substituto</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Supervisor informado</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(trocas ?? []).map((troca) => (
              <TableRow key={troca.id}>
                <TableCell>{troca.data.slice(0, 10)}</TableCell>
                <TableCell>
                  {nomePorId.get(troca.colaboradorOriginalId) ?? troca.colaboradorOriginalId} →{' '}
                  {nomePorId.get(troca.colaboradorSubstitutoId) ?? troca.colaboradorSubstitutoId}
                </TableCell>
                <TableCell>{troca.motivo ?? '—'}</TableCell>
                <TableCell>{troca.supervisorInformado}</TableCell>
                <TableCell>
                  <Badge variant={troca.confirmadoPeloRH ? 'default' : 'secondary'}>
                    {troca.confirmadoPeloRH ? 'Confirmado' : 'Pendente'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {(trocas ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhuma troca registrada neste mês.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova troca de escala</DialogTitle>
          </DialogHeader>
          <TrocaEscalaForm onSaved={() => setDialogAberto(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
