import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function PermissionDenied() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>
            Esta área é restrita a administradores. Fale com um ADMIN se precisar de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" nativeButton={false} render={<Link to="/lancamento-ponto" />}>
            Voltar para o início
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
