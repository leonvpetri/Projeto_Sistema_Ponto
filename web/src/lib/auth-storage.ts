import { jwtDecode } from 'jwt-decode'

const ACCESS_TOKEN_KEY = 'sistema-ponto:accessToken'

export type Role = 'ADMIN' | 'RH'

export interface AuthUser {
  sub: string
  email: string
  role: Role
  exp: number
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

/** Decodifica só o payload do JWT, sem verificar assinatura — uso client-side é só conveniência de UI, o backend continua sendo o enforcement real. */
export function decodeUser(token: string): AuthUser | null {
  try {
    return jwtDecode<AuthUser>(token)
  } catch {
    return null
  }
}
