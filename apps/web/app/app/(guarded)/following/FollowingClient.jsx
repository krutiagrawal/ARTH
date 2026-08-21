'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '../../proxy'

export default function FollowingClient() {
  const [ngos, setNgos] = useState(null)
  const [feed, setFeed] = useState(null)

  useEffect(() => {
    proxy('/follows')
      .then(setNgos)
      .catch((err) => toast.error(err.message || 'Could not load followed NGOs.'))
    proxy('/follows/feed')
      .then((res) => setFeed(res.updates))
      .catch((err) => toast.error(err.message || 'Could not load your feed.'))
  }, [])

  return (
    <div className="max-w-3xl">
      <p className="eyebrow text-primary">Following</p>
      <h1 className="font-serif text-3xl md:text-4xl mt-2">Updates from NGOs you follow.</h1>

      {ngos !== null && ngos.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          You&rsquo;re not following any NGOs yet. <Link href="/ngos" className="text-primary underline">Browse NGOs</Link> to follow one.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {feed === null ? (
            <>
              <Skeleton className="h-28 w-full rounded-3xl" />
              <Skeleton className="h-28 w-full rounded-3xl" />
            </>
          ) : feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet from the NGOs you follow.</p>
          ) : (
            feed.map((u) => (
              <div key={u.id} className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow flex gap-4">
                {u.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.photoUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
                )}
                <div className="min-w-0">
                  <Link href={`/ngos/${u.ngoId}`} className="text-sm font-medium text-primary hover:underline">
                    {u.ngoName}
                  </Link>
                  {u.driveTitle && <p className="text-xs text-muted-foreground mt-0.5">{u.driveTitle}</p>}
                  <p className="text-sm mt-1.5">{u.caption}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(u.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
