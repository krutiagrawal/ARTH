'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const AuthContext = createContext({
  user: null,
  loading: true,
  blocked: false,
  blockReason: null,
  refresh: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/member/proxy/auth/me')
      if (!res.ok) {
        // A blocked account keeps its session (don't bounce to "logged out")
        // — it just gets a dedicated blocked screen instead of dashboard content.
        const data = await res.json().catch(() => null)
        if (data?.error === 'ACCOUNT_BLOCKED') {
          setBlocked(true)
          setBlockReason(data.message ?? null)
        } else {
          setUser(null)
        }
        return
      }
      const data = await res.json()
      setBlocked(false)
      setUser(data ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const logout = useCallback(async () => {
    await fetch('/api/member/logout', { method: 'POST' })
    setUser(null)
    setBlocked(false)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, blocked, blockReason, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
