import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { apiRequest } from '@/lib/apiClient'
import { resolveMediaUrl } from '@/lib/media'

export const metadata = {
  title: 'NGOs',
  description: 'Verified NGOs planting trees, running drives, and tracking impact on ARTH.',
}

export default async function NgosPage({ searchParams }) {
  const { q, city } = await searchParams
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (city) params.set('city', city)

  let ngos = []
  try {
    const res = await apiRequest(`/api/ngos${params.toString() ? `?${params.toString()}` : ''}`)
    ngos = res.ngos
  } catch {
    ngos = []
  }

  return (
    <div className="container py-16">
      <p className="eyebrow text-primary">NGOs</p>
      <h1 className="font-serif text-4xl md:text-6xl mt-2">Organizations planting with purpose.</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Follow an NGO to see their drives, updates, and impact.</p>

      <form className="mt-8 flex flex-wrap gap-2 max-w-xl" action="/ngos">
        <input
          type="text"
          name="q"
          defaultValue={q || ''}
          placeholder="Search by name…"
          className="h-11 flex-1 min-w-[180px] rounded-full border border-border/70 bg-background px-4 text-sm"
        />
        <input
          type="text"
          name="city"
          defaultValue={city || ''}
          placeholder="City"
          className="h-11 w-40 rounded-full border border-border/70 bg-background px-4 text-sm"
        />
        <button type="submit" className="h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
          Search
        </button>
      </form>

      {ngos.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">No NGOs found.</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ngos.map((n) => (
            <Link
              key={n.id}
              href={`/ngos/${n.id}`}
              className="group rounded-3xl border border-border/70 bg-card p-6 soft-shadow transition hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
                  {n.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveMediaUrl(n.logoUrl)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-serif text-lg">{n.orgName.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-lg truncate">{n.orgName}</h3>
                  {n.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {n.city}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{n.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
