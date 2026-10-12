import * as React from "react"

import { cn } from "@/lib/utils"

/** Shown under a field once its `maxLength` is reached — the browser silently stops accepting input there. */
export function LimitMessage({ value, maxLength }) {
  if (!maxLength || String(value ?? "").length < maxLength) return null
  return (
    <p role="status" className="mt-1 text-xs text-destructive">
      Maximum {maxLength} characters allowed
    </p>
  )
}

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  // Phone / pincode / OTP-style fields are exact-length: a full field is a correct entry.
  const exactLength = type === "tel" || type === "number" || props.inputMode === "numeric"
  return (
    <>
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />
    {!exactLength && <LimitMessage value={props.value} maxLength={props.maxLength} />}
    </>
  );
})
Input.displayName = "Input"

export { Input }
