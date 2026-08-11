import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE, verifySession } from '@/lib/auth'

// For use in Server Components and Route Handlers only.
export async function getServerUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await verifySession(token)
  if (!payload?.sub) return null

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) return null

  const { passwordHash, ...safeUser } = user
  return safeUser
}
