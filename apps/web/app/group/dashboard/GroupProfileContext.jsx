'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { proxy } from './proxy'

const GroupProfileContext = createContext(null)

export function GroupProfileProvider({ children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await proxy('/group/profile')
      setProfile(data)
      setError(null)
      return data
    } catch (err) {
      if (err.status === 401) {
        router.push('/group/login')
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
    <GroupProfileContext.Provider value={{ profile, setProfile, loading, error, refresh }}>
      {children}
    </GroupProfileContext.Provider>
  )
}

export function useGroupProfile() {
  const ctx = useContext(GroupProfileContext)
  if (!ctx) throw new Error('useGroupProfile must be used within GroupProfileProvider')
  return ctx
}
