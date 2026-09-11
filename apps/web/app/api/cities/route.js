import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const cities = await prisma.city.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(cities.map((c) => ({ id: c.id, name: c.name, isLaunched: c.isLaunched })))
}
