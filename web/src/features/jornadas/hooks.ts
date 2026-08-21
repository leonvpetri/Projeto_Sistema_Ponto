import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createJornada, listJornadas, updateJornada } from './api'
import type { CreateJornadaInput } from './types'

const JORNADAS_KEY = ['jornadas']

export function useJornadas() {
  return useQuery({ queryKey: JORNADAS_KEY, queryFn: listJornadas })
}

export function useCreateJornada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateJornadaInput) => createJornada(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JORNADAS_KEY }),
  })
}

export function useUpdateJornada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateJornadaInput> }) => updateJornada(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JORNADAS_KEY }),
  })
}
