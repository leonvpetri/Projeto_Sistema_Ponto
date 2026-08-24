import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createAfastamento, deleteAfastamento, listAfastamentos, updateAfastamento } from './api'
import type { CreateAfastamentoInput, UpdateAfastamentoInput } from './types'

export function afastamentosKey(colaboradorId: string, mes: string) {
  return ['afastamentos', colaboradorId, mes]
}

export function useAfastamentos(colaboradorId: string | undefined, mes: string) {
  return useQuery({
    queryKey: afastamentosKey(colaboradorId ?? '', mes),
    queryFn: () => listAfastamentos(colaboradorId, mes),
  })
}

export function useCreateAfastamento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAfastamentoInput) => createAfastamento(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['afastamentos'] }),
  })
}

export function useUpdateAfastamento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAfastamentoInput }) => updateAfastamento(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['afastamentos'] }),
  })
}

export function useDeleteAfastamento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAfastamento(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['afastamentos'] }),
  })
}
