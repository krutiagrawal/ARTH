import { NextResponse } from 'next/server'

// Every logged-in area of this app (including the old Arth-native
// plant/adopt/donate/drives/dashboard pages) is now backed by the same
// services/api account, via one of three role-namespaced cookie pairs
// (member/ngo/admin — see lib/apiProxy.js). This is only a presence check for
// UX (skip flashing a guarded page to a logged-out visitor) — the real
// authorization happens on every proxied request, enforced by services/api
// itself, which is the actual source of truth.
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

  if (pathname.startsWith('/nursery/dashboard')) {
    if (!request.cookies.get('nursery_refresh_token')?.value) {
      const loginUrl = new URL('/nursery/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/group/dashboard')) {
    if (!request.cookies.get('group_refresh_token')?.value) {
      const loginUrl = new URL('/group/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  if (pathname === '/admin/login' || pathname === '/admin') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin')) {
    if (!request.cookies.get('admin_refresh_token')?.value) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // The old Arth-native adopt/donate/drives/dashboard paths all run on the
  // member session now. (/app/* used to be a second member-gated area — it's
  // retired; next.config.js redirects() sends old /app/* links here. /plant
  // is a public informational page now — planting itself is mobile-only.)
  const isMemberPath =
    pathname.startsWith('/adopt') ||
    pathname.startsWith('/donate') ||
    pathname.startsWith('/drives') ||
    pathname.startsWith('/dashboard')

  if (isMemberPath) {
    if (!request.cookies.get('member_refresh_token')?.value) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/adopt/:path*',
    '/donate/:path*',
    '/drives/:path*',
    '/dashboard/:path*',
    '/ngo/dashboard/:path*',
    '/nursery/dashboard/:path*',
    '/group/dashboard/:path*',
    '/admin/:path*',
  ],
}
