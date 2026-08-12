import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth'

export async function middleware(request) {
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
  matcher: ['/plant/:path*', '/adopt/:path*', '/donate/:path*', '/drives/:path*', '/dashboard/:path*'],
}
