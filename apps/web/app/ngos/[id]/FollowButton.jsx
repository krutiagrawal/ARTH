'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, HeartOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { proxy } from '@/lib/memberProxy'

/**
 * Follows/unfollows through the member session (a regular logged-in app
 * user, not the NGO's own account). Determines initial follow-state
 * client-side via /follows rather than passing it from the server component,
 * since that would require parsing member cookies in a page.js.
 */
export default function FollowButton({ ngoId, initialFollowersCount }) {
  const router = useRouter()
  const [following, setFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    proxy('/follows')
      .then((ngos) => setFollowing(ngos.some((n) => n.id === ngoId)))
      .catch(() => setFollowing(false))
      .finally(() => setReady(true))
  }, [ngoId])

  const toggle = async () => {
    setBusy(true)
    try {
      if (following) {
        await proxy(`/ngos/${ngoId}/follow`, { method: 'DELETE' })
        setFollowing(false)
        setFollowersCount((c) => Math.max(0, c - 1))
      } else {
        await proxy(`/ngos/${ngoId}/follow`, { method: 'POST' })
        setFollowing(true)
        setFollowersCount((c) => c + 1)
      }
    } catch (err) {
      if (err.status === 401) {
        router.push('/login')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={toggle} disabled={!ready || busy} variant={following ? 'outline' : 'default'} className="rounded-full">
        {following ? <HeartOff className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
        {following ? 'Following' : 'Follow'}
      </Button>
      <span className="text-sm text-muted-foreground">{followersCount} followers</span>
    </div>
  )
}
