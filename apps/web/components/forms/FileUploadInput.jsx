'use client'

import { useRef } from 'react'
import { X, FileText, Image as ImageIcon, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic'

/**
 * Single certificate/document upload — accepts a PDF or a photo of the document, since scanned
 * registration/tax certificates arrive as either. Mirrors
 * apps/mobile/src/components/common/DocumentPickerField.tsx.
 */
export default function FileUploadInput({ label, hint, file, onChange }) {
  const inputRef = useRef(null)

  const isPdf = file?.type === 'application/pdf'

  return (
    <div>
      {label && <span className="eyebrow">{label}</span>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'mt-2 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border px-4 py-3 text-left transition hover:border-foreground/30',
          file && 'border-solid',
        )}
      >
        {file ? isPdf ? <FileText className="h-5 w-5 shrink-0" /> : <ImageIcon className="h-5 w-5 shrink-0" /> : <Paperclip className="h-5 w-5 shrink-0 text-muted-foreground" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{file ? file.name : 'Tap to upload'}</span>
          {!file && hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        </span>
        {file && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onChange(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          if (picked) onChange(picked)
        }}
      />
    </div>
  )
}
