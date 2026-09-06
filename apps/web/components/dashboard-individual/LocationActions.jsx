'use client'

import { useState } from 'react'
import { Copy, Check, MapPin, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Ola has no publicly documented deep link for an arbitrary destination
// address (unlike Uber's `dropoff[formatted_address]` universal link), so it
// falls back to just opening the Ola site/app rather than a broken deep link.
const OLA_FALLBACK_URL = 'https://www.olacabs.com/'

export default function LocationActions({ label, address }) {
  const [copied, setCopied] = useState(false)
  if (!address) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions) — no-op.
    }
  }

  const query = encodeURIComponent(address)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`
  const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${query}`

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <p className="mt-1 flex items-start gap-1.5 text-sm">
        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" /> {address}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={copy}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy address
            </>
          )}
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation className="h-3.5 w-3.5" /> Google Maps
          </a>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <a href={uberUrl} target="_blank" rel="noopener noreferrer">
            Uber
          </a>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <a href={OLA_FALLBACK_URL} target="_blank" rel="noopener noreferrer">
            Ola
          </a>
        </Button>
      </div>
    </div>
  )
}
