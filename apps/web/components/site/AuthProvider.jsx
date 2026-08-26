'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const AuthContext = createContext({ user: null, loading: true, refresh: async () => {}, logout: async () => {} })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/member/proxy/auth/me')
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
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
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
