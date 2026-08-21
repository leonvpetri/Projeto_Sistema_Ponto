import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useColaboradores } from '@/features/colaboradores/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { usePendenciasDoMes, useProcessarApuracao } from '../hooks'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function mesAtualISO() {
  return new Date().toISOString().slice(0, 7)
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const mes = mesAtualISO()
  const { data: colaboradores } = useColaboradores()
  const { data: pendencias, isLoading: carregandoPendencias } = usePendenciasDoMes(mes)
  const processarApuracao = useProcessarApuracao()

  const totalAtivos = colaboradores?.filter((c) => c.ativo).length

  async function handleProcessar() {
    try {
      const resultado = await processarApuracao.mutateAsync(mes)
      toast.success(`Apuração de ${mes} processada (${resultado.processados} dias).`)
    } catch {
      toast.error('Não foi possível processar a apuração do mês.')
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer" onClick={() => navigate('/colaboradores')}>
          <CardHeader>
            <CardDescription>Colaboradores ativos</CardDescription>
            <CardTitle className="text-3xl">{totalAtivos ?? '—'}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer" onClick={() => navigate('/apuracao')}>
          <CardHeader>
            <CardDescription>Pendências do mês ({mes})</CardDescription>
            <CardTitle className="text-3xl">{carregandoPendencias ? '—' : (pendencias?.length ?? 0)}</CardTitle>
          </CardHeader>
        </Card>

        {user?.role === 'ADMIN' && (
          <Card>
            <CardHeader>
              <CardDescription>Fechamento mensal</CardDescription>
              <CardTitle className="text-base font-normal">Processar apuração de {mes}</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <Button onClick={handleProcessar} disabled={processarApuracao.isPending}>
                {processarApuracao.isPending ? 'Processando…' : 'Processar apuração do mês'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
