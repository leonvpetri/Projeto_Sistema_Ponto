import { apiFetch } from '@/lib/api-client'
import type { CreateJornadaInput, Jornada } from './types'

export function listJornadas() {
  return apiFetch<Jornada[]>('/jornadas')
}

export function createJornada(input: CreateJornadaInput) {
  return apiFetch<Jornada>('/jornadas', { method: 'POST', body: input })
}

export function updateJornada(id: string, input: Partial<CreateJornadaInput>) {
  return apiFetch<Jornada>(`/jornadas/${id}`, { method: 'PATCH', body: input })
}
