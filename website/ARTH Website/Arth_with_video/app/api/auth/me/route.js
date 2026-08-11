import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/session'

export async function GET() {
  const user = await getServerUser()
  return NextResponse.json({ user })
}
