'use client'

import { useState } from 'react'

export const PAGE_SIZE = 20

/**
 * Page number for a server-paginated table. The page snaps back to 1 whenever `resetKey`
 * (the filters/search that define the list) changes, derived rather than effect-driven so
 * a filter change fires one fetch, not a stale-page fetch followed by a page-1 fetch.
 */
export function usePageState(resetKey) {
  const [state, setState] = useState({ key: resetKey, page: 1 })
  const page = state.key === resetKey ? state.page : 1
  const setPage = (next) => setState({ key: resetKey, page: Math.max(1, next) })
  return [page, setPage]
}
