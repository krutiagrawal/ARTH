'use client'

const OPTIONAL_RE = /\s*\((?:([^)]*),\s*)?optional\)\s*$/i

/**
 * Sentence-case field label. A trailing "(optional)" is pulled out into a quiet pill so long
 * questions stay readable instead of shouting in letter-spaced caps.
 */
export default function FieldLabel({ children, hint }) {
  const isText = typeof children === 'string'
  const optional = isText && OPTIONAL_RE.test(children)
  const clean = optional ? children.replace(OPTIONAL_RE, (_, extra) => (extra ? ` (${extra})` : '')) : children
  return (
    <span className="block">
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        {clean}
        {optional && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Optional
          </span>
        )}
      </span>
      {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
    </span>
  )
}
