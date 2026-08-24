import type { RegistroPonto, TipoRegistro } from '@/features/registros-ponto/types'
import { TIPO_AFASTAMENTO_LABEL, type TipoAfastamento } from '@/features/afastamentos/types'
import type { ApuracaoResultado, StatusApuracao } from './types'

export interface EspelhoRow {
  data: string
  entrada1: string | null
  saida1: string | null
  entrada2: string | null
  saida2: string | null
  totalTrabalhadoMin: number | null
  status: StatusApuracao
  alertas: string[]
  afastamentoTipo: string | null
  afastamentoAbonado: boolean | null
}

/** "Férias (Abonado)" pro dia de AFASTAMENTO; traço pros demais status (FOLGA incluso). */
export function formatAfastamento(row: Pick<EspelhoRow, 'status' | 'afastamentoTipo' | 'afastamentoAbonado'>): string {
  if (row.status !== 'AFASTAMENTO' || !row.afastamentoTipo) return '—'
  const label = TIPO_AFASTAMENTO_LABEL[row.afastamentoTipo as TipoAfastamento] ?? row.afastamentoTipo
  return `${label} (${row.afastamentoAbonado ? 'Abonado' : 'Não abonado'})`
}

const TIPO_PARA_COLUNA: Record<TipoRegistro, keyof Pick<EspelhoRow, 'entrada1' | 'saida1' | 'entrada2' | 'saida2'>> = {
  ENTRADA_1: 'entrada1',
  SAIDA_1: 'saida1',
  ENTRADA_2: 'entrada2',
  SAIDA_2: 'saida2',
}

/** Cruza os totais/status calculados pelo motor (ApuracaoResultado) com as batidas reais (RegistroPonto) do mesmo mês. */
export function buildEspelhoRows(apuracao: ApuracaoResultado[], registros: RegistroPonto[]): EspelhoRow[] {
  const registrosPorDia = new Map<string, RegistroPonto[]>()
  for (const registro of registros) {
    const data = registro.dataHora.slice(0, 10)
    const lista = registrosPorDia.get(data) ?? []
    lista.push(registro)
    registrosPorDia.set(data, lista)
  }

  return apuracao
    .map((dia) => {
      const row: EspelhoRow = {
        data: dia.data,
        entrada1: null,
        saida1: null,
        entrada2: null,
        saida2: null,
        totalTrabalhadoMin: dia.totalTrabalhadoMin,
        status: dia.status,
        alertas: dia.alertas,
        afastamentoTipo: dia.afastamentoTipo,
        afastamentoAbonado: dia.afastamentoAbonado,
      }
      for (const registro of registrosPorDia.get(dia.data) ?? []) {
        row[TIPO_PARA_COLUNA[registro.tipo]] = registro.dataHora.slice(11, 16)
      }
      return row
    })
    .sort((a, b) => a.data.localeCompare(b.data))
}

export function formatMinutos(min: number | null): string {
  if (min === null) return '—'
  const horas = Math.floor(Math.abs(min) / 60)
  const minutos = Math.abs(min) % 60
  const sinal = min < 0 ? '-' : ''
  return `${sinal}${horas}h${String(minutos).padStart(2, '0')}`
}

export function espelhoRowsToCsv(rows: EspelhoRow[]): string {
  const cabecalho = [
    'Data',
    'Entrada 1',
    'Saída 1',
    'Entrada 2',
    'Saída 2',
    'Total trabalhado',
    'Status',
    'Afastamento',
    'Alertas',
  ]
  const linhas = rows.map((row) => [
    row.data,
    row.entrada1 ?? '',
    row.saida1 ?? '',
    row.entrada2 ?? '',
    row.saida2 ?? '',
    formatMinutos(row.totalTrabalhadoMin),
    row.status,
    formatAfastamento(row),
    row.alertas.join(' | '),
  ])

  return [cabecalho, ...linhas]
    .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function baixarCsv(conteudo: string, nomeArquivo: string): void {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
