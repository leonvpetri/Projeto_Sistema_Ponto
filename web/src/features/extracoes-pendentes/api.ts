import { apiFetch } from '@/lib/api-client'
import type { ConfirmarExtracaoInput, ExtracaoPendente, StatusExtracao } from './types'

export function listExtracoes(status?: StatusExtracao) {
  return apiFetch<ExtracaoPendente[]>('/extracoes-pendentes', { query: { status } })
}

export function confirmarExtracao(id: string, input: ConfirmarExtracaoInput) {
  return apiFetch<ExtracaoPendente>(`/extracoes-pendentes/${id}/confirmar`, { method: 'POST', body: input })
}

export function rejeitarExtracao(id: string, motivoRejeicao: string) {
  return apiFetch<ExtracaoPendente>(`/extracoes-pendentes/${id}/rejeitar`, { method: 'POST', body: { motivoRejeicao } })
}

export function vincularColaborador(id: string, colaboradorId: string) {
  return apiFetch<ExtracaoPendente>(`/extracoes-pendentes/${id}/vincular-colaborador`, {
    method: 'POST',
    body: { colaboradorId },
  })
}
