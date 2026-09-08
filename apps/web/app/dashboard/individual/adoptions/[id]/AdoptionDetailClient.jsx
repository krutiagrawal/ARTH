'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Info, Heart, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import LocationActions from '@/components/dashboard-individual/LocationActions'
import { proxy } from '@/lib/memberProxy'
import { resolveMediaUrl } from '@/lib/media'

export default function AdoptionDetailClient({ treeId }) {
  const [tree, setTree] = useState(null)
  const [message, setMessage] = useState('')
  const [adopting, setAdopting] = useState(false)
  const [photoBroken, setPhotoBroken] = useState(false)

  const load = () => proxy(`/adoptable-trees/${treeId}`).then(setTree).catch((err) => toast.error(err.message || 'Could not load this tree.'))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId])

  const adopt = async () => {
    setAdopting(true)
    try {
      await proxy(`/adoptable-trees/${treeId}/adopt`, { method: 'POST', body: message ? { message } : {} })
      toast.success(`You've adopted ${tree.nickname}!`)
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setAdopting(false)
    }
  }

  if (!tree) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard/individual/adoptions" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
        <div className="relative aspect-[16/9] bg-secondary">
          {tree.photoUri && !photoBroken ? (
            <img src={resolveMediaUrl(tree.photoUri)} alt={tree.nickname} onError={() => setPhotoBroken(true)} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center bg-gradient-to-br from-primary/15 to-sand/20">
              <TreePine className="h-16 w-16 text-primary/40" />
            </div>
          )}
          {tree.isAdopted && (
            <Badge variant="secondary" className="absolute top-4 right-4">
              <Heart className="h-3 w-3" /> Adopted
            </Badge>
          )}
        </div>

        <div className="p-6 md:p-8 space-y-5">
          <div>
            <p className="eyebrow text-primary">{tree.ngoName}</p>
            <h1 className="font-serif text-3xl md:text-4xl mt-2">{tree.nickname}</h1>
            <p className="text-sm italic text-muted-foreground mt-1">{tree.speciesName}</p>
          </div>

          <p className="text-sm text-muted-foreground whitespace-pre-line">{tree.description}</p>

          <LocationActions label="Location" address={[tree.location, tree.city].filter(Boolean).join(', ')} />

          {tree.instructions && (
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Info className="h-3.5 w-3.5" /> What adopting this tree involves
              </p>
              <p className="mt-1.5 text-sm whitespace-pre-line">{tree.instructions}</p>
            </div>
          )}

          <div className="pt-2 border-t border-border/70">
            {tree.isAdopted ? (
              tree.adopter ? (
                <p className="text-sm text-muted-foreground pt-4">
                  Adopted by <span className="font-medium text-foreground">{tree.adopter.name}</span>.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground pt-4">This tree has already been adopted.</p>
              )
            ) : (
              <div className="pt-4">
                <label className="block max-w-md">
                  <span className="eyebrow">Leave a message (optional)</span>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="mt-2" maxLength={500} />
                </label>
                <Button onClick={adopt} disabled={adopting} className="mt-3 rounded-full" size="lg">
                  <Heart className="h-4 w-4" /> {adopting ? 'Adopting…' : 'Adopt this tree'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
