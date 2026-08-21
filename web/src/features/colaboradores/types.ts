import type { Jornada } from '@/features/jornadas/types'

export interface Colaborador {
  id: string
  nome: string
  cpf: string
  telefone: string | null
  setor: string
  ativo: boolean
  jornadaId: string
  jornada: Jornada
  dataBaseEscala12x36: string | null
}

export interface CreateColaboradorInput {
  nome: string
  cpf: string
  setor: string
  jornadaId: string
  telefone?: string
  ativo?: boolean
  dataBaseEscala12x36?: string
}
