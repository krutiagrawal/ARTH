import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth'

// The /ngo and /admin dashboards run on a completely separate session
// (services/api bearer tokens, see lib/apiProxy.js) from arth_session below —
// this is only a presence check for UX (skip flashing the dashboard shell to a
// logged-out visitor). The real authorization happens on every proxied request,
// enforced by services/api itself, which is the actual source of truth.
//
// There are TWO unrelated admin identities (see app/admin/layout.js for the
// full note): the services/api-backed NGO-approval admin (admin_refresh_token)
// and the Arth-native isAdmin admin (arth_session, verified server-side per
// page). /admin/content and /admin/competitions are Arth-native-only surfaces,
// so they're excluded from the services/api gate below and instead fall
// through to the generic arth_session check. /admin (the unified overview) is
// meant to work for an admin holding EITHER identity, so it skips both gates
// entirely — the page itself renders each stat group's own sign-in state.
const WEB_ADMIN_PREFIXES = ['/admin/content', '/admin/competitions']

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

  // /app/* is the services/api-backed member area (RSVP/adopt against real
  // NGO-created drives/trees) — same presence-check-only pattern as /ngo/dashboard
  // above, distinct from the arth_session-gated marketing-site paths below.
  if (pathname.startsWith('/app/') && pathname !== '/app/login' && pathname !== '/app/register') {
    if (!request.cookies.get('member_refresh_token')?.value) {
      const loginUrl = new URL('/app/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  if (pathname === '/admin/login' || pathname === '/admin') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin') && !WEB_ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
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
    '/app/:path*',
  ],
}
