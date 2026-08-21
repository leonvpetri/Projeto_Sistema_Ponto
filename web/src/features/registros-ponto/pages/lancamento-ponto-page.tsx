import { LancamentoManualForm } from '../components/lancamento-manual-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LancamentoPontoPage() {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Lançamento de Ponto</h1>
      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="foto" disabled>
            Por foto (em breve)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="pt-4">
          <LancamentoManualForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
