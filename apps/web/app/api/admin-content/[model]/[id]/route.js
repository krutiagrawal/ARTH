import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'
import { ADMIN_CONTENT_MODELS, coerceFieldValue } from '@/lib/adminContent'

async function requireAdmin() {
  const user = await getServerUser()
  if (!user || !user.isAdmin) return null
  return user
}

function parseId(config, raw) {
  return config.idKind === 'autoincrement' ? Number(raw) : raw
}

export async function PATCH(request, { params }) {
  const { model, id } = await params
  const config = ADMIN_CONTENT_MODELS[model]
  if (!config) return NextResponse.json({ error: 'Unknown content type.' }, { status: 404 })

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin sign in required.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })

  const data = {}
  for (const field of config.fields) {
    if (!(field.name in body)) continue
    const value = coerceFieldValue(field, body[field.name])
    if (field.required && (value === undefined || value === null || value === '')) {
      return NextResponse.json({ error: `${field.name} is required.` }, { status: 400 })
    }
    data[field.name] = value
  }

  try {
    const item = await prisma[config.delegate].update({ where: { id: parseId(config, id) }, data })
    return NextResponse.json({ item })
  } catch {
    return NextResponse.json({ error: 'Could not update item.' }, { status: 400 })
  }
}

export async function DELETE(request, { params }) {
  const { model, id } = await params
  const config = ADMIN_CONTENT_MODELS[model]
  if (!config) return NextResponse.json({ error: 'Unknown content type.' }, { status: 404 })

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin sign in required.' }, { status: 401 })

  try {
    await prisma[config.delegate].delete({ where: { id: parseId(config, id) } })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Could not delete item.' }, { status: 400 })
  }
}
