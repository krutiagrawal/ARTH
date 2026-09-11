'use client'

import { useEffect, useState } from 'react'

export function useCities() {
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/cities')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCities(data)
      })
      .catch(() => {
        if (!cancelled) setCities([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { cities, loading }
}
