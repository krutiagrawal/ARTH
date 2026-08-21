'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { proxy } from './proxy'

// Shared create/list/update/delete/action logic for Drives, Adoptable Trees,
// Campaigns, Staff, and Updates — structurally identical CRUD surfaces (see
// ResourceTab.jsx's old version of this same comment). `listPath` defaults to
// `${basePath}/mine` (Drives/Trees/Campaigns' convention, which share a prefix
// with a public listing) — pass it explicitly for resources like Staff/Updates
// whose "list mine" endpoint is just the bare basePath (no public counterpart
// to disambiguate from).
export function useResourceCrud(basePath, listPath = `${basePath}/mine`) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await proxy(listPath))
    } catch (err) {
      toast.error(err.message || 'Could not load — please try again.')
    } finally {
      setLoading(false)
    }
  }, [listPath])

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
    [basePath, load],
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
    [basePath, load],
  )

  const remove = useCallback(
    async (id) => {
      await proxy(`${basePath}/${id}`, { method: 'DELETE' })
      await load()
    },
    [basePath, load],
  )

  const runAction = useCallback(
    async (id, action, body) => {
      await proxy(`${basePath}/${id}/${action}`, { method: 'POST', body })
      await load()
    },
    [basePath, load],
  )

  return { items, loading, load, create, update, remove, runAction }
}
