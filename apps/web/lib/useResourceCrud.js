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
export function useResourceCrud(proxy, basePath, listPath = `${basePath}/mine`) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await proxy(listPath))
    } catch (err) {
      toast.error(err.message || 'Could not load – please try again.')
    } finally {
      setLoading(false)
    }
  }, [proxy, listPath])

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

  return { items, loading, load, create, update, remove, runAction }
}
