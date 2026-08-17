'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

async function proxy(path, opts = {}) {
  const res = await fetch(`/api/admin/proxy${path}`, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.message) || 'Something went wrong.')
  return data
}

const FILTERS = ['pending', 'approved', 'rejected']

export default function AdminNgosPage() {
  const router = useRouter()
  const [filter, setFilter] = useState('pending')
  const [ngos, setNgos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setNgos(await proxy(`/admin/ngos?status=${filter}`))
    } catch (err) {
      if (err.message.includes('signed in') || err.message.includes('expired')) router.push('/admin/login')
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter, router])

  useEffect(() => {
    load()
  }, [load])

  const approve = async (id) => {
    setError('')
    try {
      await proxy(`/admin/ngos/${id}/status`, { method: 'PATCH', body: { status: 'approved' } })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const reject = async (id) => {
    setError('')
    try {
      await proxy(`/admin/ngos/${id}/status`, { method: 'PATCH', body: { status: 'rejected', rejectionReason } })
      setRejectingId(null)
      setRejectionReason('')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-primary">Admin</p>
            <h1 className="font-serif text-3xl md:text-5xl mt-2">NGO approvals</h1>
          </div>
          <Button variant="outline" className="rounded-full shrink-0" onClick={logout}>
            Sign out
          </Button>
        </div>

        <div className="mt-8 flex gap-2 border-b border-border/70">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px transition ${
                filter === f ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-8 space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && ngos.length === 0 && <p className="text-sm text-muted-foreground">No {filter} NGOs.</p>}
          {ngos.map((ngo) => (
            <div key={ngo.id} className="rounded-3xl border border-border/70 bg-card p-6 leaf-shadow">
              <h3 className="font-serif text-xl">{ngo.orgName}</h3>
              <p className="text-sm text-muted-foreground mt-1">{ngo.description}</p>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                {ngo.website && <p>{ngo.website}</p>}
                {ngo.contactPhone && <p>{ngo.contactPhone}</p>}
                {ngo.owner && <p>{ngo.owner.name} · {ngo.owner.email}</p>}
              </div>
              {ngo.status === 'rejected' && ngo.rejectionReason && (
                <p className="mt-2 text-xs text-destructive">Rejected: {ngo.rejectionReason}</p>
              )}
              {ngo.status === 'pending' && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" className="rounded-full" onClick={() => approve(ngo.id)}>
                    Approve
                  </Button>
                  {rejectingId === ngo.id ? (
                    <>
                      <input
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="h-9 rounded-full border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <Button size="sm" variant="secondary" className="rounded-full" onClick={() => reject(ngo.id)}>
                        Confirm reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => {
                          setRejectingId(null)
                          setRejectionReason('')
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setRejectingId(ngo.id)}>
                      Reject
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
