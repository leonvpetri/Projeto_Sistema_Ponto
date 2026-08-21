import { apiFetch } from '@/lib/api-client'

export interface CreateObservacaoDiaInput {
  colaboradorId: string
  data: string
  texto: string
}

export function criarObservacaoDia(input: CreateObservacaoDiaInput) {
  return apiFetch('/observacoes-dia', { method: 'POST', body: input })
}
