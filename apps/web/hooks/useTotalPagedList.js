'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

/**
 * Append-style ("Load more") list for `{ total, [listKey]: rows[] }` endpoints paged by `page` + `take`.
 * `fetcher` is the surface's own proxy (member/admin/nursery each have one). `meta` is the newest
 * response, for extra fields such as badge counts. Rows are de-duplicated by id (or followId) since offset paging
 * can repeat a row when others are added or removed between loads.
 */
export function useTotalPagedList(fetcher, path, params, { listKey, take = 20, errorMessage = 'Could not load the list.' }) {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestId = useRef(0)
  const key = JSON.stringify(params)

  const fetchPage = useCallback(
    (n) => {
      const qs = new URLSearchParams({ page: String(n), take: String(take) })
      for (const [k, v] of Object.entries(JSON.parse(key))) if (v) qs.set(k, v)
      return fetcher(`${path}?${qs.toString()}`)
    },
    [fetcher, path, key, take],
  )

  const reload = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    try {
      const data = await fetchPage(1)
      if (id !== requestId.current) return
      setItems(data[listKey])
      setMeta(data)
      setPage(1)
    } catch (err) {
      if (id !== requestId.current) return
      setItems([])
      toast.error(err.message || errorMessage)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [fetchPage, listKey, errorMessage])

  useEffect(() => {
    reload()
  }, [reload])

  const hasMore = !!meta && items.length < meta.total

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return
    const id = requestId.current
    setLoadingMore(true)
    try {
      const data = await fetchPage(page + 1)
      if (id !== requestId.current) return
      setItems((prev) => {
        const idOf = (r) => r.id ?? r.followId
        const seen = new Set(prev.map(idOf))
        return [...prev, ...data[listKey].filter((r) => !seen.has(idOf(r)))]
      })
      setMeta(data)
      setPage(page + 1)
    } catch (err) {
      toast.error(err.message || errorMessage)
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, loadingMore, page, listKey, errorMessage])

  return { items, meta, loading, loadingMore, hasMore, loadMore, reload }
}
