import { useState } from 'react'
import { useExtracoes } from '../hooks'
import { ExtracaoDetailDialog } from '../components/extracao-detail-dialog'
import type { ExtracaoPendente } from '../types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const STATUS_NA_FILA = new Set(['PENDENTE', 'SEM_IDENTIFICACAO'])

export function FilaWhatsAppPage() {
  const { data: extracoes, isLoading } = useExtracoes()
  const [selecionada, setSelecionada] = useState<ExtracaoPendente | null>(null)

  const fila = (extracoes ?? []).filter((e) => STATUS_NA_FILA.has(e.status))

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Fila do WhatsApp</h1>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : fila.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma pendência na fila.</p>
      ) : (
        <div className="space-y-2">
          {fila.map((extracao) => (
            <Card key={extracao.id} className="cursor-pointer" onClick={() => setSelecionada(extracao)}>
              <CardContent className="flex items-center gap-4 py-3">
                <img
                  src={extracao.fotoUrl}
                  alt="Foto do cartão de ponto"
                  className="h-16 w-16 shrink-0 rounded-md border object-cover"
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden'
                  }}
                />
                <div className="flex-1">
                  <p className="font-medium">
                    {extracao.colaborador?.nome ?? (
                      <Badge variant="destructive">Não identificado</Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {extracao.telefoneOrigem} · recebido em {new Date(extracao.criadoEm).toLocaleString('pt-BR')}
                  </p>
                </div>
                {extracao.conferenciaOk === false && <Badge variant="destructive">Cartão não bate com o telefone</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selecionada && <ExtracaoDetailDialog extracao={selecionada} onClose={() => setSelecionada(null)} />}
    </div>
  )
}
