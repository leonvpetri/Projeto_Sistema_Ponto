import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { useToggleAtivo } from '../hooks'
import type { Colaborador } from '../types'

export function AtivoToggle({ colaborador }: { colaborador: Colaborador }) {
  const toggleAtivo = useToggleAtivo()

  return (
    <Switch
      checked={colaborador.ativo}
      disabled={toggleAtivo.isPending}
      onCheckedChange={(ativo) => {
        toggleAtivo.mutate(
          { id: colaborador.id, ativo },
          {
            onSuccess: () => toast.success(ativo ? 'Colaborador ativado.' : 'Colaborador desativado.'),
            onError: () => toast.error('Não foi possível atualizar o status.'),
          },
        )
      }}
    />
  )
}
