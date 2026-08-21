import { test, expect, type Page } from '@playwright/test'
import { PENDING_NGO, TEST_ADMIN } from './global-setup'
import { loginAsAdmin, loginAsNgo } from './helpers'

// Drives the real admin approval UI (not a SQL bypass) through the full
// pending -> rejected -> resubmitted -> approved -> suspended -> reinstated
// cycle for a single fixture NGO, verifying both the admin queue and what
// the NGO itself sees (status banners, disabled/enabled publish actions)
// after each transition. Runs serially: each test depends on the previous
// transition having landed.
test.describe.configure({ mode: 'serial' })

async function adminTransition(
  page: Page,
  currentFilter: string,
  orgName: string,
  actionLabel: string,
  reason?: string,
) {
  await page.goto('/admin/ngos')
  await page.getByRole('button', { name: currentFilter, exact: true }).click()
  await page.getByPlaceholder('Search organizations…').fill(orgName)
  const row = page.getByRole('row', { name: orgName })
  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.getByRole('button').last().click()
  await page.getByRole('menuitem', { name: 'View details' }).click()
  await page.getByRole('button', { name: actionLabel, exact: true }).click()
  if (reason) {
    await page.getByLabel('Reason (shown to the NGO)').fill(reason)
  }
  await page.getByRole('alertdialog').getByRole('button', { name: actionLabel, exact: true }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
}

async function assertInFilter(page: Page, filter: string, orgName: string, shouldBePresent: boolean) {
  await page.goto('/admin/ngos')
  await page.getByRole('button', { name: filter, exact: true }).click()
  await page.getByPlaceholder('Search organizations…').fill(orgName)
  const row = page.getByRole('row', { name: orgName })
  if (shouldBePresent) {
    await expect(row).toBeVisible({ timeout: 10_000 })
  } else {
    await expect(row).toHaveCount(0)
  }
}

test.describe('NGO approval lifecycle', () => {
  test('admin rejects a pending application with a reason', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN)
    await adminTransition(page, 'pending', PENDING_NGO.orgName, 'Reject', 'Missing required organizational details.')
    await assertInFilter(page, 'pending', PENDING_NGO.orgName, false)
    await assertInFilter(page, 'rejected', PENDING_NGO.orgName, true)
  })

  test('rejected NGO sees the rejection reason and can resubmit back to pending', async ({ page }) => {
    await loginAsNgo(page, PENDING_NGO)
    // Regex, not a literal apostrophe: the component renders a typographic
    // "'" (&rsquo;), not the ASCII "'" — a straight-apostrophe string never
    // matches no matter how long you wait for it.
    await expect(page.getByText(/This one didn.t go through/)).toBeVisible()
    await expect(page.getByText('Missing required organizational details.', { exact: false })).toBeVisible()

    await page.goto('/ngo/dashboard/drives')
    await expect(page.getByRole('button', { name: 'New drive' })).toBeDisabled()
    await page.goto('/ngo/dashboard')

    await page.getByLabel('About your organization').fill('Updated description addressing the rejection reason.')
    await page.getByRole('button', { name: /resubmit for review/i }).click()
    await expect(page.getByText('Your application is with our team.', { exact: false })).toBeVisible({ timeout: 10_000 })
  })

  test('admin approves the resubmitted application', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN)
    await assertInFilter(page, 'pending', PENDING_NGO.orgName, true)
    await adminTransition(page, 'pending', PENDING_NGO.orgName, 'Approve')
    await assertInFilter(page, 'approved', PENDING_NGO.orgName, true)
  })

  test('approved NGO loses the status banner and gains publish access', async ({ page }) => {
    await loginAsNgo(page, PENDING_NGO)
    await expect(page.getByText('Your application is with our team.', { exact: false })).toHaveCount(0)
    await expect(page.getByText('Your account has been suspended.', { exact: false })).toHaveCount(0)

    // .first() — with zero items yet, the empty-state CTA duplicates the
    // header button's accessible name; both are driven by the same
    // isApproved-gated disabled state, so either instance proves the point.
    await page.goto('/ngo/dashboard/drives')
    await expect(page.getByRole('button', { name: 'New drive' }).first()).toBeEnabled()
    await page.goto('/ngo/dashboard/trees')
    await expect(page.getByRole('button', { name: 'New tree' }).first()).toBeEnabled()
    await page.goto('/ngo/dashboard/campaigns')
    await expect(page.getByRole('button', { name: 'New campaign' }).first()).toBeEnabled()
  })

  test('admin suspends an approved NGO with a reason', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN)
    await adminTransition(page, 'approved', PENDING_NGO.orgName, 'Suspend', 'Temporary suspension for policy review.')
    await assertInFilter(page, 'approved', PENDING_NGO.orgName, false)
    await assertInFilter(page, 'suspended', PENDING_NGO.orgName, true)
  })

  test('suspended NGO sees suspension messaging and loses publish access', async ({ page }) => {
    await loginAsNgo(page, PENDING_NGO)
    await expect(page.getByText('Your account has been suspended.', { exact: false })).toBeVisible()
    await expect(page.getByText('Temporary suspension for policy review.', { exact: false })).toBeVisible()

    await page.goto('/ngo/dashboard/campaigns')
    await expect(page.getByRole('button', { name: 'New campaign' })).toBeDisabled()
  })

  test('admin reinstates a suspended NGO back to approved', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN)
    await adminTransition(page, 'suspended', PENDING_NGO.orgName, 'Reinstate')
    await assertInFilter(page, 'suspended', PENDING_NGO.orgName, false)
    await assertInFilter(page, 'approved', PENDING_NGO.orgName, true)
  })
})
