import { test, expect } from '@playwright/test'
import { TEST_NGO } from './global-setup'
import { loginAsNgo, VALID_IMAGE, OVERSIZED_IMAGE, DISALLOWED_FILE } from './helpers'

test.describe('NGO Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsNgo(page, TEST_NGO)
    await page.goto('/ngo/dashboard/settings')
  })

  test('editing profile fields saves and persists across reload, then reverts', async ({ page }) => {
    const original = {
      orgName: await page.getByLabel('Organization name', { exact: false }).inputValue(),
      description: await page.getByLabel('About your organization', { exact: false }).inputValue(),
    }

    const updatedName = `${original.orgName} (e2e edit)`
    await page.getByLabel('Organization name', { exact: false }).fill(updatedName)
    await page.getByLabel('Phone (optional)', { exact: false }).fill('+91 9876543210')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Organization details saved.')).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await expect(page.getByLabel('Organization name', { exact: false })).toHaveValue(updatedName)
    await expect(page.getByLabel('Phone (optional)', { exact: false })).toHaveValue('+91 9876543210')

    // Revert — this is the shared approved test NGO reused across the suite.
    await page.getByLabel('Organization name', { exact: false }).fill(original.orgName)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Organization details saved.')).toBeVisible({ timeout: 10_000 })
  })

  test('uploading a valid logo shows a preview and saves', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(VALID_IMAGE)
    await expect(page.getByRole('button', { name: 'Replace' })).toBeVisible()
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Organization details saved.')).toBeVisible({ timeout: 10_000 })
  })

  test('uploading a disallowed file type is rejected with a clear error', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(DISALLOWED_FILE)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/unsupported image type/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Organization details saved.')).toHaveCount(0)
  })

  test('uploading an oversized file does not silently succeed', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(OVERSIZED_IMAGE)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Organization details saved.')).toHaveCount(0, { timeout: 10_000 })
  })
})
