import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { navItems } from './nav-items'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { user, logout } = useAuth()
  const visibleItems = navItems.filter(
    (item) => !item.requiredRoles || (user && item.requiredRoles.includes(user.role)),
  )

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/20 p-4">
        <div className="mb-6 px-2 text-sm font-semibold">Sistema de Ponto</div>
        <nav className="flex flex-1 flex-col gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-2 py-1.5 text-sm hover:bg-muted',
                  isActive && 'bg-muted font-medium text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t pt-4">
          <p className="truncate px-2 text-xs text-muted-foreground">{user?.email}</p>
          <Button variant="ghost" size="sm" className="mt-1 w-full justify-start" onClick={logout}>
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
