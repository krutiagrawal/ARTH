import { notFound } from 'next/navigation'
import { MapPin, Calendar, Users, Award, TreePine, HeartPulse } from 'lucide-react'
import { apiRequest, ApiError } from '@/lib/apiClient'
import { resolveMediaUrl } from '@/lib/media'
import FollowButton from './FollowButton'
import ReportButton from './ReportButton'

export async function generateMetadata({ params }) {
  const { id } = await params
  try {
    const ngo = await apiRequest(`/api/ngos/${id}`)
    return { title: ngo.orgName, description: ngo.description }
  } catch {
    return {}
  }
}

export default async function NgoProfilePage({ params }) {
  const { id } = await params

  let ngo
  try {
    ngo = await apiRequest(`/api/ngos/${id}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return notFound()
    throw err
  }

  return (
    <div>
      <section className="border-b border-border/70 bg-secondary/20">
        <div className="container py-14">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary border border-border/70">
              {ngo.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(ngo.logoUrl)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-serif text-3xl">{ngo.orgName.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-3xl md:text-5xl">{ngo.orgName}</h1>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {ngo.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {ngo.city}
                  </span>
                )}
                {ngo.foundedYear && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Founded {ngo.foundedYear}
                  </span>
                )}
                {ngo.volunteerCountEstimate != null && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> ~{ngo.volunteerCountEstimate.toLocaleString()} volunteers
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <FollowButton ngoId={ngo.id} initialFollowersCount={ngo.followersCount} />
              <ReportButton ngoId={ngo.id} orgName={ngo.orgName} />
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-muted-foreground leading-relaxed">{ngo.description}</p>
        </div>
      </section>

      <section className="container py-10">
        <div className="rounded-3xl border border-border/70 bg-card p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 soft-shadow">
          {[
            { icon: TreePine, label: 'Trees logged', value: ngo.impact.total.toLocaleString() },
            { icon: HeartPulse, label: 'Survival rate', value: `${ngo.impact.survivalRate}%` },
            { icon: Calendar, label: 'Featured drives', value: ngo.featuredDrives.length },
            { icon: Award, label: 'Awards', value: ngo.awards.length },
          ].map((s) => (
            <div key={s.label}>
              <div className="flex items-center gap-2 text-primary">
                <s.icon className="h-4 w-4" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</span>
              </div>
              <div className="font-serif text-3xl mt-2">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      {ngo.awards.length > 0 && (
        <section className="container py-6">
          <h2 className="font-serif text-2xl">Awards & recognition</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ngo.awards.map((a, i) => (
              <div key={i} className="rounded-2xl border border-border/70 bg-card p-4">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {[a.year, a.issuer].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {ngo.featuredDrives.length > 0 && (
        <section className="container py-10">
          <h2 className="font-serif text-2xl">Past drives</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ngo.featuredDrives.map((d) => (
              <div key={d.id} className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
                {d.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(d.photoUrl)} alt={d.title} className="h-36 w-full object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-serif text-lg">{d.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {d.city} · {new Date(d.startsAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container py-10">
        <h2 className="font-serif text-2xl">Updates</h2>
        {ngo.recentUpdates.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No updates posted yet.</p>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ngo.recentUpdates.map((u) => (
              <div key={u.id} className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
                {u.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(u.photoUrl)} alt="" className="h-40 w-full object-cover" />
                )}
                <div className="p-4">
                  {u.driveTitle && <p className="text-xs text-primary font-medium">{u.driveTitle}</p>}
                  <p className="text-sm mt-1">{u.caption}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
