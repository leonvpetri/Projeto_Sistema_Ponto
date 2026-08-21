import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTrocaEscala, listTrocasEscalaDoMes } from './api'
import type { CreateTrocaEscalaInput } from './types'

export function trocasEscalaDoMesKey(mes: string) {
  return ['trocas-escala', mes]
}

export function useTrocasEscalaDoMes(mes: string) {
  return useQuery({ queryKey: trocasEscalaDoMesKey(mes), queryFn: () => listTrocasEscalaDoMes(mes) })
}

export function useCreateTrocaEscala() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTrocaEscalaInput) => createTrocaEscala(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: trocasEscalaDoMesKey(variables.data.slice(0, 7)) })
    },
  })
}
