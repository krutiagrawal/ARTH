'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Newspaper, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ResourceFormSheet from '@/components/dashboard/ResourceFormSheet'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { useResourceCrud } from '../useResourceCrud'
import { updateFields } from '../resourceFields'
import { proxy } from '../proxy'
import { resolveMediaUrl } from '@/lib/media'

export default function UpdatesClient() {
  const { items, loading, create, remove } = useResourceCrud('/ngo/updates', '/ngo/updates')
  const [drives, setDrives] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    proxy('/drives/mine')
      .then(setDrives)
      .catch(() => setDrives([]))
  }, [])

  const fields = useMemo(
    () => [
      ...updateFields,
      {
        name: 'driveId',
        label: 'Related drive (optional)',
        type: 'select',
        section: 'Details',
        placeholder: 'Not linked to a drive',
        options: drives.map((d) => ({ value: d.id, label: d.title })),
      },
    ],
    [drives],
  )

  const handleSubmit = async (payload, photoFile) => {
    setSubmitting(true)
    try {
      await create(payload, photoFile)
      toast.success('Update posted — your followers will see it.')
      setDialogOpen(false)
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await remove(deleting.id)
      toast.success('Update deleted.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Updates</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Share an update</h1>
          <p className="mt-2 text-sm text-muted-foreground">Post photos and progress notes — your followers see these in their feed.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> New update
        </Button>
      </div>

      {loading ? null : items.length === 0 ? (
        <EmptyState icon={Newspaper} title="No updates yet" body="Post your first update to start building a following." actionLabel="New update" onAction={() => setDialogOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((u) => (
            <div key={u.id} className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
              {u.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(u.photoUrl)} alt="" className="h-40 w-full object-cover" />
              )}
              <div className="p-4">
                {u.driveTitle && <p className="text-xs text-primary font-medium">{u.driveTitle}</p>}
                <p className="text-sm mt-1">{u.caption || <span className="text-muted-foreground italic">No caption</span>}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => setDeleting(u)}
                    className="rounded p-1 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ResourceFormSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="New update"
        description="Share progress with your followers."
        icon={Newspaper}
        fields={fields}
        item={null}
        photoLabel="Photo"
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this update?"
        description="This removes it from your followers' feed permanently."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </DashboardPageShell>
  )
}
