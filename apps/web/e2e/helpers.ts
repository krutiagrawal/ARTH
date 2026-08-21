import type { Page } from '@playwright/test'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const apiDir = path.resolve(__dirname, '../../../services/api')

// The app's DELETE endpoints only soft-cancel/soft-close (by design — NGOs
// need an audit trail), so cleanup via the API leaves rows behind forever.
// Tests that seed disposable rows directly via page.request (not through
// real user-facing CRUD) hard-delete them here instead, straight from the
// DB, so repeated suite runs don't accumulate drives that skew default
// sort order and bury real fixture/test data off the first page.
export function hardDeleteDrives(ids: string[]) {
  if (!ids.length) return
  execFileSync('npx', ['prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--stdin'], {
    cwd: apiDir,
    input: `DELETE FROM drives WHERE id IN (${ids.map((id) => `'${id}'`).join(',')});`,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
  })
}

export const FIXTURES_DIR = path.resolve(__dirname, 'fixtures')
export const VALID_IMAGE = path.join(FIXTURES_DIR, 'valid-image.jpg')
export const OVERSIZED_IMAGE = path.join(FIXTURES_DIR, 'oversized-image.jpg')
export const DISALLOWED_FILE = path.join(FIXTURES_DIR, 'disallowed-type.txt')

export async function loginAsNgo(page: Page, creds: { email: string; password: string }, next?: string) {
  await page.goto(next ? `/ngo/login?next=${encodeURIComponent(next)}` : '/ngo/login')
  await page.getByLabel('Email').fill(creds.email)
  await page.getByLabel('Password').fill(creds.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(next ? `**${next}` : '**/ngo/dashboard')
}

export async function loginAsAdmin(page: Page, creds: { email: string; password: string }) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(creds.email)
  await page.getByLabel('Password').fill(creds.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/admin/ngos')
}

export async function logoutNgo(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL('**/ngo/login')
}
