'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { proxy } from './proxy'

const NgoProfileContext = createContext(null)

export function NgoProfileProvider({ children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await proxy('/ngo/profile')
      setProfile(data)
      setError(null)
      return data
    } catch (err) {
      // Only a real 401 means "you're not signed in" — anything else (the
      // API being unreachable, a 5xx, a network blip) must NOT bounce the
      // user to the login page, since that reads as "you got logged out"
      // when the actual problem is transient and has nothing to do with
      // their session.
      if (err.status === 401) {
        router.push('/ngo/login')
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
    <NgoProfileContext.Provider value={{ profile, setProfile, loading, error, refresh }}>
      {children}
    </NgoProfileContext.Provider>
  )
}

export function useNgoProfile() {
  const ctx = useContext(NgoProfileContext)
  if (!ctx) throw new Error('useNgoProfile must be used within NgoProfileProvider')
  return ctx
}
