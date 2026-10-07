'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

// Shared create/list/update/delete/action logic for any dashboard resource that's
// structurally identical CRUD — originally lived in apps/web/app/ngo/dashboard/useResourceCrud.js
// (Drives, Adoptable Trees, Campaigns, Staff, Updates) and was hoisted here, unchanged, so the
// Nursery dashboard (Inventory, Reviews, Followers, …) can reuse it too. It carries no NGO- or
// nursery-specific logic: the caller passes in its own role-scoped `proxy` function (NGO's hits
// `/api/ngo/proxy`, Nursery's hits `/api/nursery/proxy`, etc.), so this stays role-agnostic.
//
// `listPath` defaults to `${basePath}/mine` (Drives/Trees/Campaigns' convention, which share a
// prefix with a public listing) — pass it explicitly for resources like Staff/Updates/Inventory
// whose "list mine" endpoint is just the bare basePath (no public counterpart to disambiguate from).
//
// `options.pageSize` opts a resource into "load more" paging. Two list shapes are understood:
//  - a bare array paged by `page` + `take` (Drives, Adoptable Trees, Campaigns): a short page, or a
//    page that adds nothing new (an endpoint that ignores `page`), ends the list;
//  - a `{ items, nextCursor }` envelope paged by `cursor` + `take` (Stock, Delivery Partners).
// The shape is detected from the response, and an unpaged call (no `pageSize`) also unwraps an
// envelope. Every mutation reloads from the first page.
export function useResourceCrud(proxy, basePath, listPath = `${basePath}/mine`, options = {}) {
  const { pageSize } = options
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await proxy(pageSize ? `${listPath}?page=1&take=${pageSize}` : listPath)
      if (Array.isArray(res)) {
        setItems(res)
        setNextCursor(null)
        setHasMore(Boolean(pageSize) && res.length === pageSize)
      } else {
        setItems(res.items)
        setNextCursor(res.nextCursor)
        setHasMore(Boolean(res.nextCursor))
      }
      setPage(1)
    } catch (err) {
      toast.error(err.message || 'Could not load – please try again.')
    } finally {
      setLoading(false)
    }
  }, [proxy, listPath, pageSize])

  const loadMore = useCallback(async () => {
    if (!pageSize || !hasMore || loadingMore) return
    setLoadingMore(true)
    try {
      const url = nextCursor
        ? `${listPath}?cursor=${encodeURIComponent(nextCursor)}&take=${pageSize}`
        : `${listPath}?page=${page + 1}&take=${pageSize}`
      const res = await proxy(url)
      const rows = Array.isArray(res) ? res : res.items
      const seen = new Set(items.map((r) => r.id))
      const fresh = rows.filter((r) => !seen.has(r.id))
      setItems([...items, ...fresh])
      setPage(page + 1)
      if (Array.isArray(res)) {
        setHasMore(rows.length === pageSize && fresh.length > 0)
      } else {
        setNextCursor(res.nextCursor)
        setHasMore(Boolean(res.nextCursor))
      }
    } catch (err) {
      toast.error(err.message || 'Could not load more – please try again.')
    } finally {
      setLoadingMore(false)
    }
  }, [proxy, listPath, pageSize, hasMore, loadingMore, page, nextCursor, items])

  useEffect(() => {
    load()
  }, [load])

  const create = useCallback(
    async (payload, photoFile, photoFieldName = 'photo') => {
      const body = new FormData()
      for (const [k, v] of Object.entries(payload)) body.append(k, v)
      if (photoFile) body.append(photoFieldName, photoFile)
      await proxy(basePath, { method: 'POST', body })
      await load()
    },
    [proxy, basePath, load],
  )

  const update = useCallback(
    async (id, payload, photoFile, photoFieldName = 'photo') => {
      if (photoFile) {
        const body = new FormData()
        for (const [k, v] of Object.entries(payload)) body.append(k, v)
        body.append(photoFieldName, photoFile)
        await proxy(`${basePath}/${id}`, { method: 'PATCH', body })
      } else {
        await proxy(`${basePath}/${id}`, { method: 'PATCH', body: payload })
      }
      await load()
    },
    [proxy, basePath, load],
  )

  const remove = useCallback(
    async (id) => {
      await proxy(`${basePath}/${id}`, { method: 'DELETE' })
      await load()
    },
    [proxy, basePath, load],
  )

  const runAction = useCallback(
    async (id, action, body) => {
      await proxy(`${basePath}/${id}/${action}`, { method: 'POST', body })
      await load()
    },
    [proxy, basePath, load],
  )

  return { items, loading, load, create, update, remove, runAction, hasMore, loadingMore, loadMore }
}
