'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { proxy } from '@/lib/memberProxy'

/**
 * Cursor-paginated list for the `{ items, nextCursor }` envelope the API returns.
 * Loads the first chunk on mount (and whenever `params` change), then `loadMore()` appends the next.
 * Stale responses are dropped, so quickly switching filters can't mix rows from two queries.
 */
export function usePagedList(path, params = {}, { take = 20, errorMessage = 'Could not load the list.', proxyFn = proxy } = {}) {
  const [items, setItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestId = useRef(0)
  const key = JSON.stringify(params)

  const fetchPage = useCallback(
    (cursor) => {
      const qs = new URLSearchParams({ take: String(take) })
      if (cursor) qs.set('cursor', cursor)
      for (const [k, v] of Object.entries(JSON.parse(key))) if (v) qs.set(k, v)
      return proxyFn(`${path}?${qs.toString()}`)
    },
    [path, key, take, proxyFn],
  )

  const reload = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    try {
      const page = await fetchPage()
      if (id !== requestId.current) return
      setItems(page.items)
      setNextCursor(page.nextCursor)
    } catch (err) {
      if (id !== requestId.current) return
      setItems([])
      setNextCursor(null)
      toast.error(err.message || errorMessage)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [fetchPage, errorMessage])

  useEffect(() => {
    reload()
  }, [reload])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    const id = requestId.current
    setLoadingMore(true)
    try {
      const page = await fetchPage(nextCursor)
      if (id !== requestId.current) return
      setItems((prev) => [...prev, ...page.items])
      setNextCursor(page.nextCursor)
    } catch (err) {
      toast.error(err.message || errorMessage)
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, nextCursor, loadingMore, errorMessage])

  return { items, setItems, loading, loadingMore, hasMore: !!nextCursor, loadMore, reload }
}
