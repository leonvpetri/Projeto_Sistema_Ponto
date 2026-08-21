import { apiFetch, apiFetchMultipart } from '@/lib/api-client'
import type { CreateRegistroPontoInput, ExtracaoFotoResultado, RegistroPonto } from './types'

export function createRegistroPonto(input: CreateRegistroPontoInput) {
  return apiFetch<RegistroPonto>('/registros-ponto', { method: 'POST', body: input })
}

export function listRegistrosPontoDoDia(colaboradorId: string, data: string) {
  return apiFetch<RegistroPonto[]>('/registros-ponto', { query: { colaboradorId, data } })
}

export function listRegistrosPontoDoMes(colaboradorId: string, mes: string) {
  return apiFetch<RegistroPonto[]>('/registros-ponto', { query: { colaboradorId, mes } })
}

export function extrairFoto(foto: File) {
  return apiFetchMultipart<ExtracaoFotoResultado>('/registros-ponto/extrair-foto', 'foto', foto)
}
