import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth'

// The /ngo and /admin dashboards run on a completely separate session
// (services/api bearer tokens, see lib/apiProxy.js) from arth_session below —
// this is only a presence check for UX (skip flashing the dashboard shell to a
// logged-out visitor). The real authorization happens on every proxied request,
// enforced by services/api itself, which is the actual source of truth.
export async function middleware(request) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/ngo/dashboard')) {
    if (!request.cookies.get('ngo_refresh_token')?.value) {
      const loginUrl = new URL('/ngo/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // /admin/content is a separate, Arth-native admin surface (arth_session +
  // User.isAdmin — see app/admin/content/page.js), not the services/api-backed
  // NGO-approval admin below. Let it fall through to the generic session check.
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/content')) {
    if (!request.cookies.get('admin_refresh_token')?.value) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/plant/:path*',
    '/adopt/:path*',
    '/donate/:path*',
    '/drives/:path*',
    '/dashboard/:path*',
    '/ngo/dashboard/:path*',
    '/admin/:path*',
  ],
}
