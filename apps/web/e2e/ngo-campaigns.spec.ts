import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { TEST_NGO } from './global-setup'
import { loginAsNgo, VALID_IMAGE } from './helpers'

test.describe('NGO Campaigns CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsNgo(page, TEST_NGO)
  })

  test('create and edit a campaign, including its goal amount', async ({ page }) => {
    await page.goto('/ngo/dashboard/campaigns')
    await page.getByRole('button', { name: 'New campaign' }).click()

    const title = `Playwright Campaign ${Date.now()}`
    await page.getByLabel('Title', { exact: false }).fill(title)
    await page.getByLabel('Description', { exact: false }).fill('Created by the Playwright e2e spec.')
    await page.getByLabel('Goal amount', { exact: false }).fill('1000')
    await page.locator('input[type="file"]').setInputFiles(VALID_IMAGE)
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

    const row = page.getByRole('row', { name: title })
    await expect(row.getByText('of ₹1,000')).toBeVisible()

    await row.getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await page.getByLabel('Goal amount', { exact: false }).fill('2500')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(row.getByText('of ₹2,500')).toBeVisible({ timeout: 10_000 })
  })

  test('required-field validation blocks creating an incomplete campaign', async ({ page }) => {
    await page.goto('/ngo/dashboard/campaigns')
    await page.getByRole('button', { name: 'New campaign' }).click()
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('Title is required')).toBeVisible()
    await expect(page.getByText('Description is required')).toBeVisible()
  })

  test('closing and reopening a campaign toggles its status and action availability', async ({ page }) => {
    await page.goto('/ngo/dashboard/campaigns')
    await page.getByRole('button', { name: 'New campaign' }).click()
    const title = `Playwright Close-Reopen ${Date.now()}`
    await page.getByLabel('Title', { exact: false }).fill(title)
    await page.getByLabel('Description', { exact: false }).fill('Created by the Playwright e2e spec.')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

    const row = page.getByRole('row', { name: title })
    await expect(row.getByText('active')).toBeVisible()

    await row.getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'Close campaign' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Close campaign' }).click()
    await expect(row.getByText('closed')).toBeVisible({ timeout: 10_000 })

    await row.getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'Reopen campaign' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reopen campaign' }).click()
    await expect(row.getByText('active')).toBeVisible({ timeout: 10_000 })
  })

  test('donors sheet shows real donors and CSV export contains the seeded donation', async ({ page }) => {
    await page.goto('/ngo/dashboard/campaigns')
    // Search first — a growing campaigns list (from other CRUD runs) can
    // push this older, seeded row off the default first page.
    await page.getByPlaceholder('Search campaigns…').fill('E2E Seed')
    await expect(page.getByText('E2E Seed Campaign')).toBeVisible({ timeout: 10_000 })
    const row = page.getByRole('row', { name: /E2E Seed Campaign/ })
    await row.getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'View donors' }).click()

    await expect(page.getByText('E2E Donor')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('₹250', { exact: true })).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export csv/i }).click(),
    ])
    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()
    const content = fs.readFileSync(downloadPath as string, 'utf-8')
    expect(content).toContain('Name,Handle,Amount (INR),Date')
    expect(content).toContain('E2E Donor')
    expect(content).toContain('250.00')
  })

  test('search filters the campaigns list by title', async ({ page }) => {
    await page.goto('/ngo/dashboard/campaigns')
    await page.getByPlaceholder('Search campaigns…').fill('E2E Seed')
    await expect(page.getByText('E2E Seed Campaign')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/^Playwright Campaign/)).toHaveCount(0)
  })
})
