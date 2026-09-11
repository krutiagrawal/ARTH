import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/apiProxy'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  clearAuthCookies(response, 'nursery')
  return response
}
