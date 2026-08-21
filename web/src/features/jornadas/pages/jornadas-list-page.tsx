import { useState } from 'react'
import { useJornadas } from '../hooks'
import { JornadaForm } from '../components/jornada-form'
import { TIPO_ESCALA_LABEL, type Jornada } from '../types'
import { ApiError } from '@/lib/api-client'
import { PermissionDenied } from '@/components/layout/permission-denied'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function JornadasListPage() {
  const { data: jornadas, isLoading, error } = useJornadas()
  const [jornadaEmEdicao, setJornadaEmEdicao] = useState<Jornada | 'novo' | null>(null)

  if (error instanceof ApiError && error.status === 403) return <PermissionDenied />

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Jornadas</h1>
        <Button onClick={() => setJornadaEmEdicao('novo')}>Nova jornada</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Horário padrão</TableHead>
              <TableHead>Tolerância intervalo</TableHead>
              <TableHead>Adicional noturno</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(jornadas ?? []).map((jornada) => (
              <TableRow key={jornada.id}>
                <TableCell>{jornada.nome}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{TIPO_ESCALA_LABEL[jornada.tipo]}</Badge>
                </TableCell>
                <TableCell>
                  {jornada.horaEntradaPadrao && jornada.horaSaidaPadrao
                    ? `${jornada.horaEntradaPadrao} – ${jornada.horaSaidaPadrao}`
                    : '—'}
                </TableCell>
                <TableCell>{jornada.toleranciaIntervaloMin ?? '—'} min</TableCell>
                <TableCell>
                  <Badge variant={jornada.temAdicionalNoturno ? 'default' : 'secondary'}>
                    {jornada.temAdicionalNoturno ? 'Sim' : 'Não'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setJornadaEmEdicao(jornada)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={jornadaEmEdicao !== null} onOpenChange={(open) => !open && setJornadaEmEdicao(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{jornadaEmEdicao === 'novo' ? 'Nova jornada' : 'Editar jornada'}</DialogTitle>
          </DialogHeader>
          <JornadaForm
            jornada={jornadaEmEdicao !== 'novo' ? (jornadaEmEdicao ?? undefined) : undefined}
            onSaved={() => setJornadaEmEdicao(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
