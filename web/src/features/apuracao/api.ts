import { apiFetch } from '@/lib/api-client'
import type { ApuracaoResultado, Pendencia } from './types'

export function buscarApuracao(colaboradorId: string, mes: string) {
  return apiFetch<ApuracaoResultado[]>('/admin/apuracao', { query: { colaboradorId, mes } })
}

export function buscarPendencias(mes: string) {
  return apiFetch<Pendencia[]>('/admin/apuracao/pendencias', { query: { mes } })
}

export function processarApuracao(mes: string) {
  return apiFetch<{ processados: number }>('/admin/apuracao/processar', { method: 'POST', query: { mes } })
}
