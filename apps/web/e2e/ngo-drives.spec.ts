import { test, expect } from '@playwright/test'
import { TEST_NGO } from './global-setup'
import { loginAsNgo, VALID_IMAGE, hardDeleteDrives } from './helpers'

function futureIsoLocal(daysAhead: number) {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

test.describe('NGO Drives CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsNgo(page, TEST_NGO)
  })

  test('create, edit, and cancel a drive through the UI, reflected on Overview', async ({ page }) => {
    await page.goto('/ngo/dashboard/drives')
    await page.getByRole('button', { name: 'New drive' }).click()

    const driveTitle = `Playwright Drive ${Date.now()}`
    await page.getByLabel('Title', { exact: false }).fill(driveTitle)
    await page.getByLabel('Description', { exact: false }).fill('Created by the Playwright e2e spec.')
    await page.getByLabel('Location', { exact: false }).fill('Test City Park')
    await page.getByLabel('Latitude', { exact: false }).fill('12.9716')
    await page.getByLabel('Longitude', { exact: false }).fill('77.5946')
    await page.getByLabel('Starts at', { exact: false }).fill(futureIsoLocal(1))
    await page.locator('input[type="file"]').setInputFiles(VALID_IMAGE)
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText(driveTitle)).toBeVisible({ timeout: 10_000 })

    // Overview reflects the real, live drive.
    await page.goto('/ngo/dashboard')
    await expect(page.getByText('Upcoming schedule')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(driveTitle)).toBeVisible({ timeout: 10_000 })

    // Edit it.
    await page.goto('/ngo/dashboard/drives')
    const row = page.getByRole('row', { name: driveTitle })
    await row.getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    const updatedTitle = `${driveTitle} (edited)`
    await page.getByLabel('Title', { exact: false }).fill(updatedTitle)
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 10_000 })

    // View attendees (seeded drive has none, but this drive should show empty state).
    const updatedRow = page.getByRole('row', { name: updatedTitle })
    await updatedRow.getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'View attendees' }).click()
    await expect(page.getByText('No RSVPs yet.')).toBeVisible()
    await page.keyboard.press('Escape')

    // Cancel it (cleanup — sets status, doesn't delete the row).
    await updatedRow.getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'Cancel drive' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel drive' }).click()
    await expect(updatedRow.getByText('cancelled')).toBeVisible({ timeout: 10_000 })
  })

  test('required-field validation blocks creating an incomplete drive', async ({ page }) => {
    await page.goto('/ngo/dashboard/drives')
    await page.getByRole('button', { name: 'New drive' }).click()
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('Title is required')).toBeVisible()
    await expect(page.getByText('Description is required')).toBeVisible()
  })

  test('search filters the drives list by title', async ({ page }) => {
    await page.goto('/ngo/dashboard/drives')
    // Search first — a growing drives list (cancelled drives are never
    // removed) can push this older, seeded row off the default first page.
    await page.getByPlaceholder('Search drives…').fill('E2E Seed')
    await expect(page.getByText('E2E Seed Drive')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/^Playwright Drive/)).toHaveCount(0)
  })

  test('sorting by Starts toggles row order between two known drives', async ({ page }) => {
    const stamp = Date.now()
    const earlyTitle = `Sort Early ${stamp}`
    const lateTitle = `Sort Late ${stamp}`
    const ids: string[] = []
    try {
      for (const [title, days] of [[earlyTitle, 3], [lateTitle, 30]] as const) {
        const res = await page.request.post('/api/ngo/proxy/drives', {
          multipart: { title, description: 'Sort test seed.', lat: '12.9716', lng: '77.5946', startsAt: futureIsoLocal(days) },
        })
        expect(res.ok()).toBeTruthy()
        ids.push((await res.json()).id)
      }

      await page.goto('/ngo/dashboard/drives')
      // Search by the run-unique stamp, not a shared "Sort " prefix — cancelled
      // drives are never removed, so earlier runs' Sort Early/Late rows stick
      // around forever and would otherwise pollute this comparison.
      await page.getByPlaceholder('Search drives…').fill(String(stamp))
      await expect(page.getByText(earlyTitle)).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('tbody tr')).toHaveCount(2)

      // Ascending: earlier date first.
      await page.getByRole('button', { name: 'Starts' }).click()
      const ascRows = page.locator('tbody tr')
      await expect(ascRows.first()).toContainText(earlyTitle)
      await expect(ascRows.last()).toContainText(lateTitle)

      // Descending: later date first.
      await page.getByRole('button', { name: 'Starts' }).click()
      const descRows = page.locator('tbody tr')
      await expect(descRows.first()).toContainText(lateTitle)
      await expect(descRows.last()).toContainText(earlyTitle)
    } finally {
      // Hard-delete, not the soft-cancel DELETE endpoint — these are pure
      // test scaffolding (no real-user-journey meaning), and soft-cancelled
      // rows stick around forever, which would otherwise skew default sort
      // order for every later run.
      hardDeleteDrives(ids)
    }
  })

  test('pagination appears and navigates when there are more than 10 drives', async ({ page }) => {
    const createdIds: string[] = []
    try {
      for (let i = 0; i < 11; i++) {
        const res = await page.request.post('/api/ngo/proxy/drives', {
          multipart: {
            title: `Pagination Seed ${i} ${Date.now()}`,
            description: 'Pagination test seed.',
            lat: '12.9716',
            lng: '77.5946',
            startsAt: futureIsoLocal(40 + i),
          },
        })
        expect(res.ok()).toBeTruthy()
        createdIds.push((await res.json()).id)
      }

      await page.goto('/ngo/dashboard/drives')
      await expect(page.getByText(/Page 1 of \d+/)).toBeVisible({ timeout: 10_000 })
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page.getByText(/Page 2 of \d+/)).toBeVisible()
      await page.getByRole('button', { name: 'Previous' }).click()
      await expect(page.getByText(/Page 1 of \d+/)).toBeVisible()
    } finally {
      hardDeleteDrives(createdIds)
    }
  })
})
