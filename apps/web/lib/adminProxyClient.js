// Shared by every admin/(shell) client component — was duplicated verbatim
// in AdminNgosClient.jsx/AdminGroupsClient.jsx before the Accounts/Nurseries/
// Corporates/Reports/Ops/Tree-verification/Catalog pages needed the same thing.
export async function proxy(path, opts = {}) {
  const res = await fetch(`/api/admin/proxy${path}`, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.message) || 'Something went wrong.')
  return data
}
