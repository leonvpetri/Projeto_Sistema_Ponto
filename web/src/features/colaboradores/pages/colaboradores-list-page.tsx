import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useColaboradores } from '../hooks'
import { AtivoToggle } from '../components/ativo-toggle'
import { ApiError } from '@/lib/api-client'
import { PermissionDenied } from '@/components/layout/permission-denied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ColaboradoresListPage() {
  const { data: colaboradores, isLoading, error } = useColaboradores()
  const [nomeFiltro, setNomeFiltro] = useState('')
  const [setorFiltro, setSetorFiltro] = useState('todos')
  const [jornadaFiltro, setJornadaFiltro] = useState('todas')

  const setores = useMemo(
    () => Array.from(new Set((colaboradores ?? []).map((c) => c.setor))).sort(),
    [colaboradores],
  )
  const jornadasDisponiveis = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of colaboradores ?? []) map.set(c.jornadaId, c.jornada.nome)
    return Array.from(map.entries())
  }, [colaboradores])

  const listaFiltrada = (colaboradores ?? []).filter((c) => {
    if (nomeFiltro && !c.nome.toLowerCase().includes(nomeFiltro.toLowerCase())) return false
    if (setorFiltro !== 'todos' && c.setor !== setorFiltro) return false
    if (jornadaFiltro !== 'todas' && c.jornadaId !== jornadaFiltro) return false
    return true
  })

  if (error instanceof ApiError && error.status === 403) return <PermissionDenied />

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Colaboradores</h1>
        <Button nativeButton={false} render={<Link to="/colaboradores/novo" />}>
          Novo colaborador
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por nome…"
          value={nomeFiltro}
          onChange={(e) => setNomeFiltro(e.target.value)}
          className="max-w-xs"
        />
        <Select value={setorFiltro} onValueChange={(value) => setSetorFiltro(value ?? 'todos')}>
          <SelectTrigger>
            <SelectValue>{(value: string) => (value === 'todos' ? 'Todos os setores' : value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map((setor) => (
              <SelectItem key={setor} value={setor}>
                {setor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={jornadaFiltro} onValueChange={(value) => setJornadaFiltro(value ?? 'todas')}>
          <SelectTrigger>
            <SelectValue>
              {(value: string) =>
                value === 'todas' ? 'Todas as jornadas' : (jornadasDisponiveis.find(([id]) => id === value)?.[1] ?? value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as jornadas</SelectItem>
            {jornadasDisponiveis.map(([id, nome]) => (
              <SelectItem key={id} value={id}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Jornada</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listaFiltrada.map((colaborador) => (
              <TableRow key={colaborador.id}>
                <TableCell>{colaborador.nome}</TableCell>
                <TableCell>{colaborador.cpf}</TableCell>
                <TableCell>{colaborador.setor}</TableCell>
                <TableCell>{colaborador.jornada.nome}</TableCell>
                <TableCell>{colaborador.telefone ?? '—'}</TableCell>
                <TableCell>
                  <AtivoToggle colaborador={colaborador} />
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link to={`/colaboradores/${colaborador.id}/editar`} />}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {listaFiltrada.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
