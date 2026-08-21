import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buscarApuracao, buscarPendencias, processarApuracao } from './api'

export function apuracaoDoMesKey(colaboradorId: string, mes: string) {
  return ['apuracao', colaboradorId, mes]
}

export function pendenciasDoMesKey(mes: string) {
  return ['apuracao-pendencias', mes]
}

export function useApuracaoDoMes(colaboradorId: string | undefined, mes: string | undefined) {
  return useQuery({
    queryKey: apuracaoDoMesKey(colaboradorId ?? '', mes ?? ''),
    queryFn: () => buscarApuracao(colaboradorId as string, mes as string),
    enabled: !!colaboradorId && !!mes,
  })
}

export function usePendenciasDoMes(mes: string | undefined) {
  return useQuery({
    queryKey: pendenciasDoMesKey(mes ?? ''),
    queryFn: () => buscarPendencias(mes as string),
    enabled: !!mes,
  })
}

export function useProcessarApuracao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mes: string) => processarApuracao(mes),
    onSuccess: (_data, mes) => {
      queryClient.invalidateQueries({ queryKey: ['apuracao'] })
      queryClient.invalidateQueries({ queryKey: pendenciasDoMesKey(mes) })
    },
  })
}
