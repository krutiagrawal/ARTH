export async function proxy(path, opts = {}) {
  const isForm = opts.body instanceof FormData
  const res = await fetch(`/api/ngo/proxy${path}`, {
    method: opts.method || 'GET',
    headers: opts.body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: isForm ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.message) || 'Something went wrong.')
  return data
}
