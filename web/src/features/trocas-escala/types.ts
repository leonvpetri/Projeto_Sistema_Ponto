export interface TrocaEscala {
  id: string
  data: string
  colaboradorOriginalId: string
  colaboradorSubstitutoId: string
  motivo: string | null
  supervisorInformado: string
  registradoPor: string
  confirmadoPeloRH: boolean
  confirmadoEm: string | null
  criadoEm: string
}

export interface CreateTrocaEscalaInput {
  data: string
  colaboradorOriginalId: string
  colaboradorSubstitutoId: string
  motivo?: string
  supervisorInformado: string
  registradoPor: string
  confirmadoPeloRH?: boolean
}
