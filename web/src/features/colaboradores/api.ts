import { apiFetch } from '@/lib/api-client'
import type { Colaborador, CreateColaboradorInput } from './types'

export function listColaboradores() {
  return apiFetch<Colaborador[]>('/colaboradores')
}

export function getColaborador(id: string) {
  return apiFetch<Colaborador>(`/colaboradores/${id}`)
}

export function createColaborador(input: CreateColaboradorInput) {
  return apiFetch<Colaborador>('/colaboradores', { method: 'POST', body: input })
}

export function updateColaborador(id: string, input: Partial<CreateColaboradorInput>) {
  return apiFetch<Colaborador>(`/colaboradores/${id}`, { method: 'PATCH', body: input })
}
