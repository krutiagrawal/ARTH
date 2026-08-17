import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'
import { ADMIN_CONTENT_MODELS, coerceFieldValue } from '@/lib/adminContent'

async function requireAdmin() {
  const user = await getServerUser()
  if (!user || !user.isAdmin) return null
  return user
}

export async function GET(request, { params }) {
  const { model } = await params
  const config = ADMIN_CONTENT_MODELS[model]
  if (!config) return NextResponse.json({ error: 'Unknown content type.' }, { status: 404 })

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin sign in required.' }, { status: 401 })

  const items = await prisma[config.delegate].findMany({ orderBy: { id: 'asc' } })
  return NextResponse.json({ items })
}

export async function POST(request, { params }) {
  const { model } = await params
  const config = ADMIN_CONTENT_MODELS[model]
  if (!config) return NextResponse.json({ error: 'Unknown content type.' }, { status: 404 })

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin sign in required.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })

  const data = {}
  for (const field of config.fields) {
    const value = coerceFieldValue(field, body[field.name])
    if (field.required && (value === undefined || value === null || value === '')) {
      return NextResponse.json({ error: `${field.name} is required.` }, { status: 400 })
    }
    if (value !== null) data[field.name] = value
  }

  if (config.idKind === 'string') {
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'An id (slug) is required for this content type.' }, { status: 400 })
    }
    data.id = body.id
  }

  try {
    const item = await prisma[config.delegate].create({ data })
    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'An item with that id already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Could not create item.' }, { status: 400 })
  }
}
