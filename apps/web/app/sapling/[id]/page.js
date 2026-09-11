import { notFound } from 'next/navigation'
import { TreePine, Leaf, MapPin, CalendarDays, ShieldCheck, Sprout } from 'lucide-react'
import { apiRequest, ApiError } from '@/lib/apiClient'

export async function generateMetadata({ params }) {
  const { id } = await params
  try {
    const passport = await apiRequest(`/api/sapling-units/${id}/passport`)
    return { title: `${passport.speciesCommonName} · Sapling passport` }
  } catch {
    return { title: 'Sapling passport' }
  }
}

const STATUS_LABEL = {
  issued: 'Issued by nursery',
  collected: 'Collected',
  planted: 'Planted',
  void: 'Void',
}

const VERIFICATION_LABEL = {
  unverified: 'Awaiting verification',
  verified: 'Verified planted',
  rejected: 'Verification failed',
}

/**
 * Public, unauthenticated — what a QR code on a sapling resolves to when
 * scanned by any generic phone camera. Deliberately minimal (no PII, no
 * precise coordinates), backed directly by the public
 * GET /api/sapling-units/:id/passport endpoint. Doubles as the "Tree
 * Passport" surface.
 */
export default async function SaplingPassportPage({ params }) {
  const { id } = await params

  let passport
  try {
    passport = await apiRequest(`/api/sapling-units/${id}/passport`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return notFound()
    throw err
  }

  const isPlanted = Boolean(passport.plantedAt)

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
        <div className="bg-gradient-to-br from-primary/25 to-sand/25 px-6 py-10 text-center">
          <span className="text-6xl">{passport.speciesEmoji || '🌱'}</span>
          <h1 className="font-serif text-2xl md:text-3xl mt-3">{passport.speciesCommonName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sapling passport</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Sprout className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Supplied by</p>
              <p className="text-sm font-medium">
                {passport.nurseryName}
                {passport.nurseryCity ? ` · ${passport.nurseryCity}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Supply date</p>
              <p className="text-sm font-medium">{passport.supplyDate ? new Date(passport.supplyDate).toLocaleDateString() : '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <TreePine className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-medium">{STATUS_LABEL[passport.status] || passport.status}</p>
            </div>
          </div>

          {isPlanted && (
            <>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Leaf className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">Planted</p>
                  <p className="text-sm font-medium">{new Date(passport.plantedAt).toLocaleDateString()}</p>
                </div>
              </div>

              {passport.plantationArea && (
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">Area</p>
                    <p className="text-sm font-medium">{passport.plantationArea}</p>
                  </div>
                </div>
              )}

              {passport.verificationStatus && (
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">Verification</p>
                    <p className="text-sm font-medium">{VERIFICATION_LABEL[passport.verificationStatus] || passport.verificationStatus}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {!isPlanted && (
            <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
              This sapling hasn&rsquo;t been planted yet. Once it is, its planting date and verification status will
              appear here.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
