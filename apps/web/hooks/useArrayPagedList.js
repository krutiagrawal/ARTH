'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { proxy as memberProxy } from '@/lib/memberProxy'

/**
 * "Load more" list for endpoints that return a bare array paged by `page` + `limit` (no total):
 * a short page means we've reached the end.
 */
export function useArrayPagedList(path, { take = 24, errorMessage = 'Could not load the list.', proxyFn = memberProxy } = {}) {
  const [items, setItems] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestId = useRef(0)

  const fetchPage = useCallback((n) => proxyFn(`${path}?page=${n}&limit=${take}`), [proxyFn, path, take])

  const reload = useCallback(async () => {
    const id = ++requestId.current
    try {
      const rows = await fetchPage(1)
      if (id !== requestId.current) return
      setItems(rows)
      setPage(1)
      setHasMore(rows.length === take)
    } catch (err) {
      if (id !== requestId.current) return
      setItems([])
      setHasMore(false)
      toast.error(err.message || errorMessage)
    }
  }, [fetchPage, take, errorMessage])

  useEffect(() => {
    reload()
  }, [reload])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return
    const id = requestId.current
    setLoadingMore(true)
    try {
      const rows = await fetchPage(page + 1)
      if (id !== requestId.current) return
      setItems((prev) => {
        const seen = new Set((prev ?? []).map((r) => r.id))
        return [...(prev ?? []), ...rows.filter((r) => !seen.has(r.id))]
      })
      setPage(page + 1)
      setHasMore(rows.length === take)
    } catch (err) {
      toast.error(err.message || errorMessage)
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, loadingMore, page, take, errorMessage])

  return { items, loading: items === null, loadingMore, hasMore, loadMore, reload }
}
