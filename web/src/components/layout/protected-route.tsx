import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import type { Role } from '@/lib/auth-storage'
import { PermissionDenied } from './permission-denied'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: Role[]
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requiredRoles && (!user || !requiredRoles.includes(user.role))) return <PermissionDenied />

  return <>{children}</>
}
