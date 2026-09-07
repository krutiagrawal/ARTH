'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/site/AuthProvider'
import AccountBlockedScreen from '@/components/dashboard/AccountBlockedScreen'

export default function RequireIndividualUser({ children }) {
  const { user, loading, blocked, blockReason, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user && !blocked) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [loading, user, blocked, router, pathname])

  if (blocked) {
    return <AccountBlockedScreen reason={blockReason} onSignOut={() => logout().then(() => router.replace('/login'))} />
  }

  if (loading || !user) return null

  return children
}
