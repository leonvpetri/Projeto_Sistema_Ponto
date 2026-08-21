import { Badge } from '@/components/ui/badge'
import { STATUS_LABEL, type StatusApuracao } from '../types'

const VARIANT_POR_STATUS: Record<StatusApuracao, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  OK: 'default',
  FOLGA: 'secondary',
  ATRASO: 'outline',
  HORA_EXTRA: 'outline',
  FALTA: 'destructive',
  INCONSISTENTE: 'destructive',
}

export function StatusBadge({ status }: { status: StatusApuracao }) {
  return <Badge variant={VARIANT_POR_STATUS[status]}>{STATUS_LABEL[status]}</Badge>
}
