import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DiaExtraido } from './converters'

interface DiaTableEditorProps {
  dias: DiaExtraido[]
  onChange: (dias: DiaExtraido[]) => void
}

const CAMPOS_HORARIO = [
  { campo: 'entrada1', label: 'Entrada 1' },
  { campo: 'saida1', label: 'Saída 1' },
  { campo: 'entrada2', label: 'Entrada 2' },
  { campo: 'saida2', label: 'Saída 2' },
] as const

/**
 * Tabela editável dia-a-dia do cartão de ponto — reaproveitada tanto no
 * lançamento por foto (manual) quanto na Fila do WhatsApp, para o RH
 * corrigir o que a extração automática leu antes de confirmar.
 */
export function DiaTableEditor({ dias, onChange }: DiaTableEditorProps) {
  function atualizarCampo(index: number, campo: keyof DiaExtraido, valor: string) {
    const novaLista = dias.slice()
    novaLista[index] = { ...novaLista[index], [campo]: valor || null }
    onChange(novaLista)
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dia</TableHead>
            {CAMPOS_HORARIO.map(({ campo, label }) => (
              <TableHead key={campo}>{label}</TableHead>
            ))}
            <TableHead>Observação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dias.map((dia, index) => (
            <TableRow key={dia.dia}>
              <TableCell className="whitespace-nowrap font-medium">{dia.dia}</TableCell>
              {CAMPOS_HORARIO.map(({ campo }) => (
                <TableCell key={campo}>
                  <Input
                    type="time"
                    value={dia[campo] ?? ''}
                    onChange={(e) => atualizarCampo(index, campo, e.target.value)}
                    className="w-28"
                  />
                </TableCell>
              ))}
              <TableCell>
                <Input
                  value={dia.observacao ?? ''}
                  onChange={(e) => atualizarCampo(index, 'observacao', e.target.value)}
                  placeholder="—"
                  className="w-40"
                />
              </TableCell>
            </TableRow>
          ))}
          {dias.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Nenhum dia extraído.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
