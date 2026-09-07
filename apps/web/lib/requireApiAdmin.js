// The services/api-backed admin session (admin_access_token/admin_refresh_token
// cookies, a services/api User with role:'admin') is now the only admin identity —
// the old Arth-native isAdmin flag went away with apps/web's own User table.
import { proxyToApi } from './apiProxy'

export async function requireApiAdmin(request) {
  const result = await proxyToApi(request, 'admin', '/api/auth/me')
  // Admin accounts can never actually be blocked (admin.service.ts's
  // blockAccount refuses to block role:'admin'), but surface it correctly
  // rather than lumping it in with "not signed in" if it were ever possible.
  if (result.data?.error === 'ACCOUNT_BLOCKED') return { blocked: true, blockReason: result.data.message }
  if (result.status !== 200 || result.data?.role !== 'admin') return null
  return result.data
}
