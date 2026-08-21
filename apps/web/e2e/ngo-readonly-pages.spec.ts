import { test, expect } from '@playwright/test'
import { TEST_NGO } from './global-setup'
import { loginAsNgo } from './helpers'

test.describe('NGO read-only pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsNgo(page, TEST_NGO)
  })

  test('Donations shows the real seeded donation and search filters it', async ({ page }) => {
    await page.goto('/ngo/dashboard/donations')
    const row = page.getByRole('row', { name: /E2E Seed Campaign/ })
    await expect(row).toBeVisible({ timeout: 10_000 })
    await expect(row.getByText('E2E Donor')).toBeVisible()
    await expect(row.getByText('₹250')).toBeVisible()

    await page.getByPlaceholder('Search by campaign…').fill('nonexistent campaign xyz')
    await expect(row).toHaveCount(0)
    await page.getByPlaceholder('Search by campaign…').fill('E2E Seed')
    await expect(row).toBeVisible()
  })

  test('Volunteers shows the real seeded RSVP and search filters it', async ({ page }) => {
    await page.goto('/ngo/dashboard/volunteers')
    const row = page.getByRole('row', { name: /E2E Donor/ })
    await expect(row).toBeVisible({ timeout: 10_000 })
    await expect(row.getByText(/^[1-9]\d*$/)).toBeVisible() // drives attended, non-zero

    await page.getByPlaceholder('Search volunteers…').fill('nonexistent volunteer xyz')
    await expect(row).toHaveCount(0)
  })

  test('Reports renders real stat tiles and trend charts', async ({ page }) => {
    await page.goto('/ngo/dashboard/reports')
    await expect(page.getByText('Trees adopted')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Total raised')).toBeVisible()

    for (const title of ['Donations', 'RSVPs', 'Adoptions']) {
      await expect(page.getByRole('main').getByText(title, { exact: true })).toBeVisible()
    }
    // Recharts renders an SVG per chart — three trend charts should produce three.
    await expect(page.locator('svg.recharts-surface')).toHaveCount(3, { timeout: 10_000 })
  })
})
