export async function proxy(path, opts = {}) {
  const isForm = opts.body instanceof FormData
  let res
  try {
    res = await fetch(`/api/ngo/proxy${path}`, {
      method: opts.method || 'GET',
      headers: opts.body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: isForm ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    const networkErr = new Error('Could not reach the server.')
    networkErr.status = 0
    throw networkErr
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error((data && data.message) || 'Something went wrong.')
    err.status = res.status
    throw err
  }
  return data
}
