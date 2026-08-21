import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColaborador, getColaborador, listColaboradores, updateColaborador } from './api'
import type { CreateColaboradorInput } from './types'

const COLABORADORES_KEY = ['colaboradores']

export function useColaboradores() {
  return useQuery({ queryKey: COLABORADORES_KEY, queryFn: listColaboradores })
}

export function useColaborador(id: string | undefined) {
  return useQuery({
    queryKey: [...COLABORADORES_KEY, id],
    queryFn: () => getColaborador(id as string),
    enabled: !!id,
  })
}

export function useCreateColaborador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateColaboradorInput) => createColaborador(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COLABORADORES_KEY }),
  })
}

export function useUpdateColaborador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateColaboradorInput> }) => updateColaborador(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COLABORADORES_KEY }),
  })
}

export function useToggleAtivo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => updateColaborador(id, { ativo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COLABORADORES_KEY }),
  })
}
