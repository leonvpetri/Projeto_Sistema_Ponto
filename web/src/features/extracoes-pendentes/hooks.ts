import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { confirmarExtracao, listExtracoes, rejeitarExtracao, vincularColaborador } from './api'
import type { ConfirmarExtracaoInput, StatusExtracao } from './types'

const EXTRACOES_KEY = ['extracoes-pendentes']

export function useExtracoes(status?: StatusExtracao) {
  return useQuery({ queryKey: [...EXTRACOES_KEY, status ?? 'todas'], queryFn: () => listExtracoes(status) })
}

export function useConfirmarExtracao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConfirmarExtracaoInput }) => confirmarExtracao(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXTRACOES_KEY }),
  })
}

export function useRejeitarExtracao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivoRejeicao }: { id: string; motivoRejeicao: string }) => rejeitarExtracao(id, motivoRejeicao),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXTRACOES_KEY }),
  })
}

export function useVincularColaborador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, colaboradorId }: { id: string; colaboradorId: string }) => vincularColaborador(id, colaboradorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXTRACOES_KEY }),
  })
}
