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
  const [blocked, setBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await proxy('/ngo/profile')
      setProfile(data)
      setError(null)
      setBlocked(false)
      return data
    } catch (err) {
      // Only a real 401 means "you're not signed in" — anything else (the
      // API being unreachable, a 5xx, a network blip) must NOT bounce the
      // user to the login page, since that reads as "you got logged out"
      // when the actual problem is transient and has nothing to do with
      // their session. A block is its own case: keep the session, show a
      // dedicated blocked screen instead of "can't reach the server".
      if (err.code === 'ACCOUNT_BLOCKED') {
        setBlocked(true)
        setBlockReason(err.message || null)
      } else if (err.status === 401) {
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
    <NgoProfileContext.Provider value={{ profile, setProfile, loading, error, blocked, blockReason, refresh }}>
      {children}
    </NgoProfileContext.Provider>
  )
}

export function useNgoProfile() {
  const ctx = useContext(NgoProfileContext)
  if (!ctx) throw new Error('useNgoProfile must be used within NgoProfileProvider')
  return ctx
}
