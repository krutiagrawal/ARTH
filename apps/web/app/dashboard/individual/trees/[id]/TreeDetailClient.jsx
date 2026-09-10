'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Check, Pencil, Trash2, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import LocationActions from '@/components/dashboard-individual/LocationActions'
import { proxy } from '@/lib/memberProxy'
import { resolveMediaUrl } from '@/lib/media'

export default function TreeDetailClient({ id }) {
  const router = useRouter()
  const [tree, setTree] = useState(null)
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    proxy(`/trees/${id}`)
      .then((t) => {
        setTree(t)
        setNickname(t.nickname)
      })
      .catch((err) => toast.error(err.message || 'Could not load this tree.'))
  }, [id])

  const saveNickname = async () => {
    if (!nickname.trim()) return
    setSaving(true)
    try {
      const updated = await proxy(`/trees/${id}`, { method: 'PATCH', body: { nickname: nickname.trim() } })
      setTree(updated)
      setEditing(false)
      toast.success('Updated.')
    } catch (err) {
      toast.error(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Remove ${tree.nickname} from your account? This can't be undone.`)) return
    setDeleting(true)
    try {
      await proxy(`/trees/${id}`, { method: 'DELETE' })
      toast.success('Removed.')
      router.push('/dashboard/individual/trees')
    } catch (err) {
      toast.error(err.message || 'Could not remove this tree.')
      setDeleting(false)
    }
  }

  if (!tree) {
    return (
      <DashboardPageShell>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full rounded-3xl mt-6" />
      </DashboardPageShell>
    )
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${tree.lat},${tree.lng}`

  return (
    <DashboardPageShell className="max-w-2xl">
      <Link href="/dashboard/individual/trees" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My Trees
      </Link>

      <div className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
        <div className="relative aspect-[16/9] bg-secondary">
          {tree.photoUri ? (
            <img src={resolveMediaUrl(tree.photoUri)} alt={tree.nickname} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-6xl">{tree.speciesEmoji || '🌱'}</div>
          )}
          {tree.growthStage && (
            <Badge variant="secondary" className="absolute top-4 right-4">{tree.growthStage}</Badge>
          )}
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            {editing ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="flex-1 h-10 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40 font-serif text-xl"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={saveNickname} disabled={saving} aria-label="Save">
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setNickname(tree.nickname) }} aria-label="Cancel">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <h1 className="font-serif text-3xl">{tree.nickname}</h1>
                <p className="text-sm text-muted-foreground italic mt-1">{tree.species}</p>
              </div>
            )}
            {!editing && (
              <Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label="Rename">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border/70 p-4 text-center">
              <p className="text-xs text-muted-foreground">CO₂ absorbed</p>
              <p className="font-serif text-xl mt-1">{Number(tree.co2Absorbed ?? 0).toFixed(1)} kg</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Zap className="h-3 w-3" /> XP earned</p>
              <p className="font-serif text-xl mt-1">{tree.xpEarned ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4 text-center">
              <p className="text-xs text-muted-foreground">Planted</p>
              <p className="font-serif text-sm mt-1.5">{tree.plantedAt ? new Date(tree.plantedAt).toLocaleDateString() : '–'}</p>
            </div>
          </div>

          <LocationActions label="Where it's growing" address={tree.location || `${tree.lat}, ${tree.lng}`} />

          <div className="flex justify-end pt-2 border-t border-border/70">
            <Button variant="ghost" onClick={remove} disabled={deleting} className="text-destructive hover:text-destructive rounded-full">
              <Trash2 className="h-4 w-4" /> {deleting ? 'Removing…' : 'Remove this tree'}
            </Button>
          </div>
        </div>
      </div>
    </DashboardPageShell>
  )
}
