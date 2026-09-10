import { NextResponse } from 'next/server'
import { proxyToApi, setAuthCookies, clearAuthCookies } from '@/lib/apiProxy'
import { sendEmail } from '@/lib/email'

const ROLE = 'admin'

const NGO_STATUS_PATH = /^\/api\/admin\/ngos\/[^/]+\/status$/

const NGO_STATUS_EMAIL = {
  approved: (ngo) => ({
    subject: `You're approved, ${ngo.orgName}! 🌱`,
    html: `<p>Hi ${ngo.owner.name},</p>
<p>Wonderful news – <strong>${ngo.orgName}</strong> has been approved on ARTH.</p>
<p>You can now create drives, list adoptable trees, and run donation campaigns for your community. Head to your dashboard to get started.</p>
<p>Thank you for the work you do – we're glad to have you with us.</p>
<p>– The ARTH team</p>`,
  }),
  rejected: (ngo) => ({
    subject: 'An update on your ARTH application',
    html: `<p>Hi ${ngo.owner.name},</p>
<p>Thank you for applying to bring <strong>${ngo.orgName}</strong> to ARTH. After review, we're not able to approve it as it stands.${ngo.rejectionReason ? ` Our team noted: "${ngo.rejectionReason}"` : ''}</p>
<p>This isn't the end of the road – you're welcome to update your details and submit again whenever you're ready, from your dashboard.</p>
<p>Thank you for your patience, and for wanting to be part of this.</p>
<p>– The ARTH team</p>`,
  }),
}

async function notifyNgoOfStatusChange(ngo) {
  const build = NGO_STATUS_EMAIL[ngo.status]
  if (!build || !ngo.owner?.email) return
  const { subject, html } = build(ngo)
  try {
    await sendEmail({ to: ngo.owner.email, subject, html })
  } catch (err) {
    console.error('[admin/ngos/status] failed to send status email', err)
  }
}

async function handle(request, { params }, method) {
  const { path } = await params
  const apiPath = `/api/${path.join('/')}${request.nextUrl.search}`
  const contentType = request.headers.get('content-type') || ''

  let body
  let isForm = false
  if (method !== 'GET' && method !== 'DELETE') {
    if (contentType.includes('multipart/form-data')) {
      body = await request.formData()
      isForm = true
    } else {
      body = await request.json().catch(() => undefined)
    }
  }

  const result = await proxyToApi(request, ROLE, apiPath, { method, body, isForm })

  if (method === 'PATCH' && NGO_STATUS_PATH.test(apiPath) && result.status < 300) {
    await notifyNgoOfStatusChange(result.data)
  }

  if (result.status === 204) {
    const response = new NextResponse(null, { status: 204 })
    if (result.newTokens) setAuthCookies(response, ROLE, result.newTokens)
    return response
  }

  const response = NextResponse.json(result.data, { status: result.status })
  if (result.newTokens) setAuthCookies(response, ROLE, result.newTokens)
  if (result.clearCookies) clearAuthCookies(response, ROLE)
  return response
}

export const GET = (request, ctx) => handle(request, ctx, 'GET')
export const POST = (request, ctx) => handle(request, ctx, 'POST')
export const PATCH = (request, ctx) => handle(request, ctx, 'PATCH')
export const DELETE = (request, ctx) => handle(request, ctx, 'DELETE')
