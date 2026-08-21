'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Controlled file input + thumbnail preview. No existing NGO form exposes a
 * file input today even though the backend already accepts multipart photo
 * uploads on create — this closes that gap.
 */
export default function PhotoUploadField({ label = 'Photo', value, onChange, currentUrl }) {
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const displayUrl = previewUrl || currentUrl

  return (
    <div>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2.5">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-border/70 bg-muted">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob:/relative preview URL, not a static asset
            <img src={displayUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-[7px] px-2.5 text-xs" onClick={() => inputRef.current?.click()}>
            {displayUrl ? 'Replace' : 'Upload'}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" className="h-7 rounded-[7px] px-2.5 text-xs" onClick={() => onChange(null)}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </div>
    </div>
  )
}
