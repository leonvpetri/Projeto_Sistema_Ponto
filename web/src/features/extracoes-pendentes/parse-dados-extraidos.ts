import { diaNumeroParaISO, type DiaExtraido } from '@/components/cartao-ponto/converters'

/**
 * O JSON de `dadosExtraidos` vem do prompt configurado no workflow n8n
 * ("Ponto - Extração de Cartão via WhatsApp (Zernio)", nó "Extrair dados via
 * Claude (visão)") — conferido direto na instância n8n desta VPS em
 * 2026-08-21. O nó manda `mesReferencia` como "MM/AAAA" (ex.: "08/2026"),
 * não ISO "YYYY-MM" — por isso a normalização abaixo. O resto do schema
 * (`dias: [{dia: number, entrada1, saida1, entrada2, saida2, observacao}]`)
 * bate com o que este parser já esperava.
 */
export function parseDadosExtraidos(dadosExtraidos: unknown): DiaExtraido[] | null {
  if (!dadosExtraidos || typeof dadosExtraidos !== 'object') return null
  const obj = dadosExtraidos as Record<string, unknown>
  if (!Array.isArray(obj.dias)) return null

  const mesReferencia = normalizarMesReferencia(obj.mesReferencia)

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

/** Aceita "MM/AAAA" (formato real do n8n) ou "YYYY-MM" (ISO, caso o prompt do n8n mude no futuro). */
function normalizarMesReferencia(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const iso = valor.match(/^(\d{4})-(\d{2})$/)
  if (iso) return valor
  const br = valor.match(/^(\d{1,2})\/(\d{4})$/)
  if (br) return `${br[2]}-${br[1].padStart(2, '0')}`
  return null
}
