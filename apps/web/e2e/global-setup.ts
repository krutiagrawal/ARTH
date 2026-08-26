import { execFileSync } from 'node:child_process'
import path from 'node:path'

export const TEST_NGO = {
  email: 'vriksha.test@example.com',
  password: 'TestPass123!',
  name: 'Vriksha Admin',
  handle: 'vriksha_test',
  orgName: 'Vriksha',
  description: 'A test NGO for automated UI verification.',
}

// A second NGO, deliberately left at its default `pending` status — used to
// test approval-gating (disabled buttons, status banners) and to drive the
// real admin approve/reject/suspend UI instead of the SQL bypass below.
export const PENDING_NGO = {
  email: 'pending.test@example.com',
  password: 'TestPass123!',
  name: 'Pending Admin',
  handle: 'pending_test',
  orgName: 'Pending Sprout Collective',
  description: 'A second test NGO, left pending, for approval-lifecycle testing.',
}

// Matches services/api/scripts/seed_e2e.ts — that script owns creating these
// accounts (with a known password, unlike create_admin.ts's random one), so
// only the credentials are duplicated here for the specs to import.
export const TEST_ADMIN = { email: 'admin.e2e@example.com', password: 'AdminPass123!' }
export const TEST_DONOR = { email: 'donor.e2e@example.com', password: 'DonorPass123!' }

const API_URL = process.env.API_URL || 'http://localhost:4000'
const apiDir = path.resolve(__dirname, '../../../services/api')
// The Prisma schema/migrations now live in the shared packages/db workspace —
// see packages/db/prisma/schema.prisma — services/api itself no longer has one.
const dbDir = path.resolve(__dirname, '../../../packages/db')

async function registerNgo(ngo: typeof TEST_NGO) {
  const res = await fetch(`${API_URL}/api/auth/register-ngo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ngo),
  })
  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to provision NGO ${ngo.email}: ${res.status} ${await res.text()}`)
  }
}

// Provisions (or reuses) fixed test accounts — an approved NGO, a pending
// NGO, a platform admin, and a donor — plus a little seed activity data, so
// the full e2e suite can log in and do real create/read operations through
// the UI instead of relying on hardcoded dashboard fixtures.
export default async function globalSetup() {
  await registerNgo(TEST_NGO)
  await registerNgo(PENDING_NGO)

  execFileSync(
    'npx',
    ['prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--stdin'],
    {
      cwd: dbDir,
      input: `
        UPDATE ngo_profiles SET status = 'approved' WHERE user_id = (SELECT id FROM users WHERE email = '${TEST_NGO.email}');
        UPDATE ngo_profiles SET status = 'pending', rejection_reason = NULL, approved_at = NULL, approved_by_user_id = NULL WHERE user_id = (SELECT id FROM users WHERE email = '${PENDING_NGO.email}');
      `,
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: true,
    }
  )

  execFileSync('npx', ['tsx', 'scripts/seed_e2e.ts'], {
    cwd: apiDir,
    stdio: 'inherit',
    shell: true,
  })
}
