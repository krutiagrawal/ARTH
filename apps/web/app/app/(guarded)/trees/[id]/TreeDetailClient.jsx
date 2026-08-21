'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Info, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import LocationActions from '../../../LocationActions'
import { proxy } from '../../../proxy'

export default function TreeDetailClient({ treeId }) {
  const [tree, setTree] = useState(null)
  const [message, setMessage] = useState('')
  const [adopting, setAdopting] = useState(false)

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
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Link href="/app/trees" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <p className="eyebrow text-primary">{tree.ngoName}</p>
      <h1 className="font-serif text-3xl md:text-4xl mt-2">{tree.nickname}</h1>
      <p className="text-sm italic text-muted-foreground mt-1">{tree.speciesName}</p>
      <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{tree.description}</p>

      <div className="mt-5">
        <LocationActions label="Location" address={[tree.location, tree.city].filter(Boolean).join(', ')} />
      </div>

      {tree.instructions && (
        <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/20 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Info className="h-3.5 w-3.5" /> What adopting this tree involves
          </p>
          <p className="mt-1.5 text-sm whitespace-pre-line">{tree.instructions}</p>
        </div>
      )}

      <div className="mt-8">
        {tree.isAdopted ? (
          tree.adopter ? (
            <p className="text-sm text-muted-foreground">
              Adopted by <span className="font-medium text-foreground">{tree.adopter.name}</span>.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">This tree has already been adopted.</p>
          )
        ) : (
          <>
            <label className="block max-w-md">
              <span className="eyebrow">Leave a message (optional)</span>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="mt-2" maxLength={500} />
            </label>
            <Button onClick={adopt} disabled={adopting} className="mt-3 rounded-full" size="lg">
              <Heart className="h-4 w-4" /> {adopting ? 'Adopting…' : 'Adopt this tree'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
