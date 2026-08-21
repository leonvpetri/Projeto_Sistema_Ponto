import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRegistroPonto, listRegistrosPontoDoDia } from './api'
import type { CreateRegistroPontoInput } from './types'

export function registrosPontoDoDiaKey(colaboradorId: string, data: string) {
  return ['registros-ponto', colaboradorId, data]
}

export function useRegistrosPontoDoDia(colaboradorId: string | undefined, data: string | undefined) {
  return useQuery({
    queryKey: registrosPontoDoDiaKey(colaboradorId ?? '', data ?? ''),
    queryFn: () => listRegistrosPontoDoDia(colaboradorId as string, data as string),
    enabled: !!colaboradorId && !!data,
  })
}

export function useCreateRegistroPonto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRegistroPontoInput) => createRegistroPonto(input),
    onSuccess: (_data, variables) => {
      const data = variables.dataHora.slice(0, 10)
      queryClient.invalidateQueries({ queryKey: registrosPontoDoDiaKey(variables.colaboradorId, data) })
    },
  })
}
