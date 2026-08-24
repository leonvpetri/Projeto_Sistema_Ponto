import { apiFetch } from '@/lib/api-client'
import type { Afastamento, CreateAfastamentoInput, UpdateAfastamentoInput } from './types'

export function listAfastamentos(colaboradorId?: string, mes?: string) {
  return apiFetch<Afastamento[]>('/afastamentos', { query: { colaboradorId, mes } })
}

export function createAfastamento(input: CreateAfastamentoInput) {
  return apiFetch<Afastamento>('/afastamentos', { method: 'POST', body: input })
}

export function updateAfastamento(id: string, input: UpdateAfastamentoInput) {
  return apiFetch<Afastamento>(`/afastamentos/${id}`, { method: 'PATCH', body: input })
}

export function deleteAfastamento(id: string) {
  return apiFetch<void>(`/afastamentos/${id}`, { method: 'DELETE' })
}
