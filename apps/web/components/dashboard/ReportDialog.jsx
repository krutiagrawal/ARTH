'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { proxy } from '@/lib/memberProxy'

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'nudity', label: 'Nudity' },
  { value: 'violence', label: 'Violence' },
  { value: 'other', label: 'Other' },
]

// Generic report-submission dialog for any reportable target (post, story,
// user, ngo, nursery, corporate) — posts through the member proxy to
// POST /api/reports (services/api/src/routes/social.routes.ts).
export default function ReportDialog({ open, onOpenChange, targetType, targetId, targetLabel }) {
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    try {
      await proxy('/reports', { method: 'POST', body: { targetType, targetId, reason, details: details || undefined } })
      toast.success('Thanks — our team will review this.')
      setDetails('')
      setReason('spam')
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Flag className="h-4 w-4 text-destructive" /> Report{targetLabel ? ` ${targetLabel}` : ''}
          </DialogTitle>
          <DialogDescription>Let us know what&rsquo;s wrong — our team reviews every report.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="eyebrow mb-2">Reason</p>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    reason === r.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="eyebrow">Details (optional)</span>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="mt-2" placeholder="Anything that helps us review this faster." />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
            Cancel
          </Button>
          <Button variant="destructive" disabled={submitting} onClick={submit} className="rounded-full">
            {submitting ? 'Submitting…' : 'Submit report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
