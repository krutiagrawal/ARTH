'use client'

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useCities } from '@/hooks/useCities'

/**
 * City is currently launched in Pune only — every other city is listed (not
 * hidden) but disabled, so people can see where's coming next.
 */
export default function CitySelect({ value, onChange, className }) {
  const { cities } = useCities()

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={className ?? 'mt-2 h-11 rounded-full'}>
        <SelectValue placeholder="Select city" />
      </SelectTrigger>
      <SelectContent>
        {cities.map((c) => (
          <SelectItem key={c.id} value={c.name} disabled={!c.isLaunched}>
            {c.name}
            {!c.isLaunched ? ' (coming soon)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
