import { diaNumeroParaISO, type DiaExtraido } from '@/components/cartao-ponto/converters'

/**
 * O JSON de `dadosExtraidos` vem do prompt configurado no workflow n8n, que
 * este repo não controla — por isso o parse é defensivo: qualquer formato
 * inesperado vira `null` em vez de quebrar a tela, e a tela mostra o JSON
 * bruto como alternativa.
 */
export function parseDadosExtraidos(dadosExtraidos: unknown): DiaExtraido[] | null {
  if (!dadosExtraidos || typeof dadosExtraidos !== 'object') return null
  const obj = dadosExtraidos as Record<string, unknown>
  if (!Array.isArray(obj.dias)) return null

  const mesReferencia = typeof obj.mesReferencia === 'string' ? obj.mesReferencia : null

  try {
    return obj.dias.map((diaBruto): DiaExtraido => {
      const d = diaBruto as Record<string, unknown>
      const diaStr = String(d.dia ?? d.data ?? '')
      return {
        dia: diaStr.includes('-') ? diaStr : diaNumeroParaISO(diaStr, mesReferencia),
        entrada1: typeof d.entrada1 === 'string' ? d.entrada1 : null,
        saida1: typeof d.saida1 === 'string' ? d.saida1 : null,
        entrada2: typeof d.entrada2 === 'string' ? d.entrada2 : null,
        saida2: typeof d.saida2 === 'string' ? d.saida2 : null,
        observacao: typeof d.observacao === 'string' ? d.observacao : null,
      }
    })
  } catch {
    return null
  }
}
