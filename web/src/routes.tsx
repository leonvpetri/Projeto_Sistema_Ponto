import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/login-page'
import { ColaboradoresListPage } from '@/features/colaboradores/pages/colaboradores-list-page'
import { ColaboradorFormPage } from '@/features/colaboradores/pages/colaborador-form-page'
import { JornadasListPage } from '@/features/jornadas/pages/jornadas-list-page'
import { LancamentoPontoPage } from '@/features/registros-ponto/pages/lancamento-ponto-page'
import { TrocasEscalaPage } from '@/features/trocas-escala/pages/trocas-escala-page'
import { AppShell } from '@/components/layout/app-shell'
import { ProtectedRoute } from '@/components/layout/protected-route'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/lancamento-ponto" element={<LancamentoPontoPage />} />
        <Route path="/trocas-escala" element={<TrocasEscalaPage />} />

        <Route
          path="/colaboradores"
          element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <ColaboradoresListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/colaboradores/novo"
          element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <ColaboradorFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/colaboradores/:id/editar"
          element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <ColaboradorFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jornadas"
          element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <JornadasListPage />
            </ProtectedRoute>
          }
        />

        <Route index element={<Navigate to="/lancamento-ponto" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/lancamento-ponto" replace />} />
    </Routes>
  )
}
