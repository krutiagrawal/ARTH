import { test, expect } from '@playwright/test'
import { TEST_NGO, PENDING_NGO } from './global-setup'
import { loginAsNgo } from './helpers'

test.describe('NGO Overview', () => {
  test('stat tiles reflect real, non-zero data for the active fixture NGO', async ({ page }) => {
    await loginAsNgo(page, TEST_NGO)
    await expect(page.getByText('Active campaigns')).toBeVisible({ timeout: 10_000 })

    const activeCampaignsTile = page.locator('text=Active campaigns').locator('..').locator('..')
    await expect(activeCampaignsTile.getByText(/^[1-9]\d*$/)).toBeVisible()

    const rsvpsTile = page.locator('text=Total RSVPs').locator('..').locator('..')
    await expect(rsvpsTile.getByText(/^[1-9]\d*$/)).toBeVisible()
  })

  test('quick action chips navigate to the right dashboard sections', async ({ page }) => {
    await loginAsNgo(page, TEST_NGO)
    await page.getByRole('link', { name: 'Manage drives' }).click()
    await expect(page).toHaveURL(/\/ngo\/dashboard\/drives/)

    await page.goto('/ngo/dashboard')
    await page.getByRole('link', { name: 'Manage campaigns' }).click()
    await expect(page).toHaveURL(/\/ngo\/dashboard\/campaigns/)

    await page.goto('/ngo/dashboard')
    await page.getByRole('link', { name: 'Add adoptable tree' }).click()
    await expect(page).toHaveURL(/\/ngo\/dashboard\/trees/)
  })

  test('an NGO with no activity yet sees empty states, not fake data', async ({ page }) => {
    await loginAsNgo(page, PENDING_NGO)
    await expect(page.getByText('No upcoming drives scheduled.')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('No activity yet')).toBeVisible()
  })
})
