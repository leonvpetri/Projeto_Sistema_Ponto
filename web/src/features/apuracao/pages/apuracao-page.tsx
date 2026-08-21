import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useColaboradores } from '@/features/colaboradores/hooks'
import { useRegistrosPontoDoMes } from '@/features/registros-ponto/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { useApuracaoDoMes, usePendenciasDoMes, useProcessarApuracao } from '../hooks'
import { buildEspelhoRows, espelhoRowsToCsv, formatMinutos, baixarCsv } from '../espelho'
import { StatusBadge } from '../components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/ui/field'

function mesAtualISO() {
  return new Date().toISOString().slice(0, 7)
}

export function ApuracaoPage() {
  const { user } = useAuth()
  const [colaboradorId, setColaboradorId] = useState('')
  const [mes, setMes] = useState(mesAtualISO())

  const { data: colaboradores = [] } = useColaboradores()
  const { data: apuracao, isLoading: carregandoApuracao } = useApuracaoDoMes(colaboradorId || undefined, mes)
  const { data: registros } = useRegistrosPontoDoMes(colaboradorId || undefined, mes)
  const { data: pendencias, isLoading: carregandoPendencias } = usePendenciasDoMes(mes)
  const processarApuracao = useProcessarApuracao()

  const colaboradorSelecionado = colaboradores.find((c) => c.id === colaboradorId)

  const linhas = useMemo(() => buildEspelhoRows(apuracao ?? [], registros ?? []), [apuracao, registros])

  async function handleProcessar() {
    try {
      const resultado = await processarApuracao.mutateAsync(mes)
      toast.success(`Apuração de ${mes} processada (${resultado.processados} dias).`)
    } catch {
      toast.error('Não foi possível processar a apuração do mês.')
    }
  }

  function handleExportar() {
    if (!colaboradorSelecionado) return
    const csv = espelhoRowsToCsv(linhas)
    baixarCsv(csv, `apuracao-${colaboradorSelecionado.nome}-${mes}.csv`)
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Apuração</h1>
        {user?.role === 'ADMIN' && (
          <Button onClick={handleProcessar} disabled={processarApuracao.isPending}>
            {processarApuracao.isPending ? 'Processando…' : 'Processar apuração do mês'}
          </Button>
        )}
      </div>

      <Tabs defaultValue="espelho">
        <TabsList>
          <TabsTrigger value="espelho">Espelho de ponto</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências do mês</TabsTrigger>
        </TabsList>

        <TabsContent value="espelho" className="pt-4">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <Field>
              <FieldLabel htmlFor="apuracao-colaborador">Colaborador</FieldLabel>
              <Select value={colaboradorId} onValueChange={(value) => setColaboradorId(value ?? '')}>
                <SelectTrigger id="apuracao-colaborador" className="w-64">
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
            </Field>
            <Field>
              <FieldLabel htmlFor="apuracao-mes">Mês</FieldLabel>
              <Input id="apuracao-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-fit" />
            </Field>
            <Button variant="outline" onClick={handleExportar} disabled={!colaboradorId || linhas.length === 0}>
              Exportar CSV
            </Button>
          </div>

          {!colaboradorId ? (
            <p className="text-sm text-muted-foreground">Selecione um colaborador para ver o espelho de ponto.</p>
          ) : carregandoApuracao ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : linhas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma apuração encontrada para este mês — processe o fechamento primeiro.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Entrada 1</TableHead>
                  <TableHead>Saída 1</TableHead>
                  <TableHead>Entrada 2</TableHead>
                  <TableHead>Saída 2</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((row) => (
                  <TableRow key={row.data}>
                    <TableCell>{row.data}</TableCell>
                    <TableCell>{row.entrada1 ?? '—'}</TableCell>
                    <TableCell>{row.saida1 ?? '—'}</TableCell>
                    <TableCell>{row.entrada2 ?? '—'}</TableCell>
                    <TableCell>{row.saida2 ?? '—'}</TableCell>
                    <TableCell>{formatMinutos(row.totalTrabalhadoMin)}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.alertas.join(', ') || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="pendencias" className="pt-4">
          <div className="mb-4">
            <Field>
              <FieldLabel htmlFor="apuracao-pendencias-mes">Mês</FieldLabel>
              <Input
                id="apuracao-pendencias-mes"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="w-fit"
              />
            </Field>
          </div>
          {carregandoPendencias ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pendencias ?? []).map((p) => (
                  <TableRow key={`${p.colaboradorId}-${p.data}`}>
                    <TableCell>{p.colaboradorNome}</TableCell>
                    <TableCell>{p.data}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.alertas.join(', ') || '—'}</TableCell>
                  </TableRow>
                ))}
                {(pendencias ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Nenhuma pendência neste mês.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
