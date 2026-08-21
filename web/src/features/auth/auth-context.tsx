import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/lib/api-client'
import { clearAccessToken, decodeUser, getAccessToken, setAccessToken, type AuthUser } from '@/lib/auth-storage'

interface LoginInput {
  email: string
  senha: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = getAccessToken()
    return token ? decodeUser(token) : null
  })

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login: async ({ email, senha }) => {
        const { accessToken } = await apiFetch<{ accessToken: string }>('/auth/login', {
          method: 'POST',
          body: { email, senha },
        })
        setAccessToken(accessToken)
        setUser(decodeUser(accessToken))
        navigate('/dashboard', { replace: true })
      },
      logout: () => {
        clearAccessToken()
        setUser(null)
        navigate('/login', { replace: true })
      },
    }),
    [user, navigate],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
