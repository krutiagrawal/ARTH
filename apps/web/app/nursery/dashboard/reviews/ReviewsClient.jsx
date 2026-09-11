'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import { proxy } from '../proxy'

function RatingStars({ rating }) {
  const r = Math.round(Number(rating) || 0)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < r ? 'fill-primary text-primary' : 'text-border'}`} />
      ))}
    </div>
  )
}

function ReviewRow({ review, onRespond }) {
  const [responding, setResponding] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await onRespond(review.id, text.trim())
      setResponding(false)
      setText('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 soft-shadow">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{review.user?.avatarEmoji || '🙂'}</span>
          <span className="text-sm font-medium">{review.user?.name || 'A buyer'}</span>
        </div>
        <RatingStars rating={review.nurseryRating} />
      </div>
      {review.comment && <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>}
      <p className="mt-1 text-xs text-muted-foreground/70">{new Date(review.createdAt).toLocaleDateString()}</p>

      {review.nurseryResponse ? (
        <div className="mt-3 rounded-xl bg-secondary/30 p-3">
          <p className="text-xs font-medium text-primary">Your response</p>
          <p className="mt-1 text-sm">{review.nurseryResponse}</p>
        </div>
      ) : responding ? (
        <div className="mt-3 space-y-2">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a response…" className="rounded-xl" />
          <div className="flex gap-2">
            <Button size="sm" className="rounded-full" disabled={submitting} onClick={submit}>{submitting ? 'Posting…' : 'Post response'}</Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setResponding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-3 rounded-full" onClick={() => setResponding(true)}>Respond</Button>
      )}
    </div>
  )
}

export default function ReviewsClient() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setReviews(await proxy('/nursery/reviews'))
    } catch (err) {
      toast.error(err.message || 'Could not load reviews.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const respond = async (id, response) => {
    try {
      await proxy(`/nursery/reviews/${id}/respond`, { method: 'POST', body: { response } })
      toast.success('Response posted.')
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
      throw err
    }
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Reviews</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">What buyers are saying</h1>
      </div>

      {loading ? (
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" body="Reviews from buyers after a completed order will show up here." />
      ) : (
        <div className="space-y-3 max-w-2xl">
          {reviews.map((r) => (
            <ReviewRow key={r.id} review={r} onRespond={respond} />
          ))}
        </div>
      )}
    </DashboardPageShell>
  )
}
