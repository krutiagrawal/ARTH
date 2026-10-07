'use client'

import { Button } from '@/components/ui/button'

/** "Load more" control for usePagedList; renders nothing once the list is exhausted. */
export default function LoadMoreButton({ hasMore, loading, onClick }) {
  if (!hasMore) return null
  return (
    <div className="flex justify-center pt-2">
      <Button variant="outline" size="sm" onClick={onClick} disabled={loading}>
        {loading ? 'Loading…' : 'Load more'}
      </Button>
    </div>
  )
}
