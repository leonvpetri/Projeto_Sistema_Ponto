import type { Role } from '@/lib/auth-storage'

export interface NavItem {
  to: string
  label: string
  requiredRoles?: Role[]
}

export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/lancamento-ponto', label: 'Lançamento de Ponto' },
  { to: '/apuracao', label: 'Apuração' },
  { to: '/trocas-escala', label: 'Trocas de Escala' },
  { to: '/colaboradores', label: 'Colaboradores', requiredRoles: ['ADMIN'] },
  { to: '/jornadas', label: 'Jornadas', requiredRoles: ['ADMIN'] },
]
