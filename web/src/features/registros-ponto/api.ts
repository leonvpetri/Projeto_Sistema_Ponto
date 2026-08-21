import { apiFetch } from '@/lib/api-client'
import type { CreateRegistroPontoInput, RegistroPonto } from './types'

export function createRegistroPonto(input: CreateRegistroPontoInput) {
  return apiFetch<RegistroPonto>('/registros-ponto', { method: 'POST', body: input })
}

export function listRegistrosPontoDoDia(colaboradorId: string, data: string) {
  return apiFetch<RegistroPonto[]>('/registros-ponto', { query: { colaboradorId, data } })
}

export function listRegistrosPontoDoMes(colaboradorId: string, mes: string) {
  return apiFetch<RegistroPonto[]>('/registros-ponto', { query: { colaboradorId, mes } })
}
