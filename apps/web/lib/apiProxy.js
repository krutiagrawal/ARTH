// Session + proxy plumbing shared by the /member, /ngo, and /admin areas. All
// three are services/api accounts (role 'user' / 'ngo'-equivalent / 'admin') —
// each gets its own httpOnly cookie pair, namespaced by role (see cookieNames
// below), since a browser can hold more than one of these sessions at once.
import { apiRequest, ApiError } from './apiClient'

export function cookieNames(role) {
  return { access: `${role}_access_token`, refresh: `${role}_refresh_token` }
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export function setAuthCookies(response, role, { accessToken, refreshToken }) {
  const { access, refresh } = cookieNames(role)
  response.cookies.set(access, accessToken, { ...authCookieOptions, maxAge: 60 * 15 })
  response.cookies.set(refresh, refreshToken, { ...authCookieOptions, maxAge: 60 * 60 * 24 * 30 })
}

export function clearAuthCookies(response, role) {
  const { access, refresh } = cookieNames(role)
  response.cookies.set(access, '', { ...authCookieOptions, maxAge: 0 })
  response.cookies.set(refresh, '', { ...authCookieOptions, maxAge: 0 })
}

// Forwards a request to services/api using the stored role session, transparently
// refreshing the access token once on a 401 — mirrors apps/mobile/src/api/client.ts.
export async function proxyToApi(request, role, path, { method = 'GET', body, isForm } = {}) {
  const { access, refresh } = cookieNames(role)
  const accessToken = request.cookies.get(access)?.value
  const refreshToken = request.cookies.get(refresh)?.value

  if (!refreshToken) {
    return { status: 401, data: { error: 'UNAUTHORIZED', message: 'Not signed in.' } }
  }

  let newTokens = null

  const doRefresh = async () => {
    const refreshed = await apiRequest('/api/auth/refresh', { method: 'POST', body: { refreshToken } })
    newTokens = { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken }
    return refreshed.accessToken
  }

  try {
    const token = accessToken || (await doRefresh())
    let data;
    try {
      data = await apiRequest(path, { method, body, isForm, token })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && accessToken) {
        const freshToken = await doRefresh()
        data = await apiRequest(path, { method, body, isForm, token: freshToken })
      } else {
        throw err
      }
    }
    return { status: method === 'DELETE' && data === null ? 204 : 200, data, newTokens }
  } catch (err) {
    if (err instanceof ApiError) {
      const clearCookies = err.status === 401
      return { status: err.status, data: { error: err.code, message: err.message }, clearCookies }
    }
    return { status: 502, data: { error: 'PROXY_ERROR', message: 'Failed to reach the API.' } }
  }
}
