'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Users, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { proxy } from './proxy'
import ResourceTab from './ResourceTab'

const TABS = [
  { key: 'drives', label: 'Drives' },
  { key: 'trees', label: 'Adoptable Trees' },
  { key: 'campaigns', label: 'Campaigns' },
]

const driveFields = [
  { name: 'title', label: 'Title', required: true },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  { name: 'locationLabel', label: 'Location (e.g. city / area)' },
  { name: 'lat', label: 'Latitude', type: 'number', required: true },
  { name: 'lng', label: 'Longitude', type: 'number', required: true },
  {
    name: 'startsAt',
    label: 'Starts at',
    type: 'datetime-local',
    required: true,
    fromApi: (v) => (v ? new Date(v).toISOString().slice(0, 16) : ''),
  },
  { name: 'durationMinutes', label: 'Duration (minutes)', type: 'number' },
  { name: 'capacity', label: 'Capacity (leave blank for unlimited)', type: 'number' },
]

const treeFields = [
  { name: 'nickname', label: 'Tree nickname', required: true },
  { name: 'speciesName', label: 'Species', required: true },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  { name: 'locationLabel', label: 'Location' },
  { name: 'lat', label: 'Latitude', type: 'number', required: true },
  { name: 'lng', label: 'Longitude', type: 'number', required: true },
]

const campaignFields = [
  { name: 'title', label: 'Title', required: true },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  {
    name: 'goalAmount',
    label: 'Goal amount (₹, optional)',
    type: 'number',
    apiName: 'goalAmountCents',
    toApi: (v) => Math.round(Number(v) * 100),
    fromApi: (v) => (v != null ? v / 100 : ''),
  },
]

export default function NgoDashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('drives')

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await proxy('/ngo/profile'))
    } catch {
      router.push('/ngo/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const logout = async () => {
    await fetch('/api/ngo/logout', { method: 'POST' })
    router.push('/ngo/login')
  }

  if (loading) {
    return (
      <div className="pt-32 md:pt-40 pb-24 container max-w-4xl">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }
  if (!profile) return null

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-primary">NGO Dashboard</p>
            <h1 className="font-serif text-3xl md:text-5xl mt-2">{profile.orgName}</h1>
          </div>
          <Button variant="outline" className="rounded-full shrink-0" onClick={logout}>
            Sign out
          </Button>
        </div>

        {profile.status === 'pending' && (
          <div className="mt-8 rounded-3xl border border-border/70 bg-card p-6 leaf-shadow">
            <p className="font-medium">Your NGO account is pending approval.</p>
            <p className="text-sm text-muted-foreground mt-1">
              An ARTH admin needs to review and approve your organization before you can create drives, adoptable
              trees, or donation campaigns. Check back soon.
            </p>
          </div>
        )}

        {profile.status === 'rejected' && (
          <div className="mt-8 rounded-3xl border border-destructive/40 bg-card p-6 leaf-shadow">
            <p className="font-medium text-destructive">Your NGO application was not approved.</p>
            {profile.rejectionReason && <p className="text-sm text-muted-foreground mt-1">{profile.rejectionReason}</p>}
          </div>
        )}

        {profile.status === 'approved' && (
          <>
            <div className="mt-8 flex gap-2 border-b border-border/70">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
                    tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-8">
              {tab === 'drives' && (
                <ResourceTab
                  basePath="/drives"
                  fields={driveFields}
                  cancelLabel="Cancel drive"
                  emptyLabel="No drives yet — create your first planting drive."
                  renderCard={(d) => (
                    <>
                      <h3 className="font-serif text-xl">{d.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.location || `${d.lat}, ${d.lng}`}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(d.startsAt).toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {d.confirmedCount}{d.capacity != null ? ` / ${d.capacity}` : ''} going</span>
                        <span className="capitalize">{d.status}</span>
                      </div>
                    </>
                  )}
                />
              )}

              {tab === 'trees' && (
                <ResourceTab
                  basePath="/adoptable-trees"
                  fields={treeFields}
                  cancelLabel="Remove"
                  emptyLabel="No adoptable trees listed yet."
                  renderCard={(t) => (
                    <>
                      <h3 className="font-serif text-xl">{t.nickname}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{t.speciesName} · {t.description}</p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.location || `${t.lat}, ${t.lng}`}</span>
                        <span className="capitalize">{t.status}</span>
                      </div>
                    </>
                  )}
                />
              )}

              {tab === 'campaigns' && (
                <ResourceTab
                  basePath="/campaigns"
                  fields={campaignFields}
                  cancelLabel="Close campaign"
                  emptyLabel="No donation campaigns yet."
                  renderCard={(c) => (
                    <>
                      <h3 className="font-serif text-xl">{c.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> ₹{(c.raisedAmountCents / 100).toLocaleString()}
                          {c.goalAmountCents ? ` of ₹${(c.goalAmountCents / 100).toLocaleString()}` : ' raised'}
                        </span>
                        <span className="capitalize">{c.status}</span>
                      </div>
                    </>
                  )}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
