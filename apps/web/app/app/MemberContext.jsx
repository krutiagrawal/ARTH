'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { proxy } from './proxy'

const MemberContext = createContext(null)

export function MemberProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await proxy('/auth/me')
      setUser(data)
      setError(null)
      return data
    } catch (err) {
      // Only a real 401 means "you're not signed in" — anything else (the
      // API being unreachable, a 5xx, a network blip) must NOT bounce the
      // user to the login page.
      if (err.status === 401) {
        router.push('/app/login')
      } else {
        setError(err.message || 'Could not reach the server.')
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <MemberContext.Provider value={{ user, setUser, loading, error, refresh }}>
      {children}
    </MemberContext.Provider>
  )
}

export function useMember() {
  const ctx = useContext(MemberContext)
  if (!ctx) throw new Error('useMember must be used within MemberProvider')
  return ctx
}
