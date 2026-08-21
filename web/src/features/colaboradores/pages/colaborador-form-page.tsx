import { useParams } from 'react-router-dom'
import { useColaborador } from '../hooks'
import { ColaboradorForm } from '../components/colaborador-form'

export function ColaboradorFormPage() {
  const { id } = useParams<{ id: string }>()
  const { data: colaborador, isLoading } = useColaborador(id)

  if (id && isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">{colaborador ? 'Editar colaborador' : 'Novo colaborador'}</h1>
      <ColaboradorForm colaborador={colaborador} />
    </div>
  )
}
