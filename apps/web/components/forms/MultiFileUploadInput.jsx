'use client'

import { useRef, useMemo, useEffect } from 'react'
import { X, ImagePlus } from 'lucide-react'

/**
 * Multi-photo upload capped at `max` (5, for the proof-of-work "past plantation activities"
 * photos) — mirrors apps/mobile/src/components/social/MultiPhotoPickerField.tsx, minus reordering
 * since a handful of unordered photos doesn't need it on a desktop form.
 */
export default function MultiFileUploadInput({ label, hint, files, onChange, max = 5 }) {
  const inputRef = useRef(null)
  const isFull = files.length >= max

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews])

  const addFiles = (picked) => {
    const next = [...files, ...Array.from(picked)].slice(0, max)
    onChange(next)
  }

  const removeAt = (index) => onChange(files.filter((_, i) => i !== index))

  return (
    <div>
      <div className="flex items-center justify-between">
        {label && <span className="eyebrow">{label}</span>}
        <span className="text-xs text-muted-foreground">{files.length}/{max}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}

      <div className="mt-2 flex flex-wrap gap-3">
        {previews.map((src, index) => (
          <div key={src} className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {!isFull && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-foreground/30"
          >
            <ImagePlus className="h-6 w-6" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
