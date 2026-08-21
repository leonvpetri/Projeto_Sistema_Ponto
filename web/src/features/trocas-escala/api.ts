import { apiFetch } from '@/lib/api-client'
import type { CreateTrocaEscalaInput, TrocaEscala } from './types'

export function listTrocasEscalaDoMes(mes: string) {
  return apiFetch<TrocaEscala[]>('/trocas-escala', { query: { mes } })
}

export function createTrocaEscala(input: CreateTrocaEscalaInput) {
  return apiFetch<TrocaEscala>('/trocas-escala', { method: 'POST', body: input })
}
