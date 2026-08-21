import { test, expect } from '@playwright/test'
import { TEST_NGO } from './global-setup'
import { loginAsNgo, VALID_IMAGE } from './helpers'

test.describe('NGO Adoptable Trees CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsNgo(page, TEST_NGO)
  })

  test('create, edit, and remove a tree', async ({ page }) => {
    await page.goto('/ngo/dashboard/trees')
    await page.getByRole('button', { name: 'New tree' }).click()

    const nickname = `Playwright Tree ${Date.now()}`
    await page.getByLabel('Tree nickname', { exact: false }).fill(nickname)
    await page.getByLabel('Species', { exact: false }).fill('Banyan')
    await page.getByLabel('Description', { exact: false }).fill('Created by the Playwright e2e spec.')
    await page.getByLabel('Location', { exact: false }).fill('Test Grove')
    await page.getByLabel('Latitude', { exact: false }).fill('12.9716')
    await page.getByLabel('Longitude', { exact: false }).fill('77.5946')
    await page.locator('input[type="file"]').setInputFiles(VALID_IMAGE)
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText(nickname)).toBeVisible({ timeout: 10_000 })

    const row = page.getByRole('row', { name: nickname })
    await row.getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    const updatedNickname = `${nickname} (edited)`
    await page.getByLabel('Tree nickname', { exact: false }).fill(updatedNickname)
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText(updatedNickname)).toBeVisible({ timeout: 10_000 })

    // "Remove" sets status to `removed` — same audit-trail design as
    // drives/campaigns — it does not delete the row, so it stays visible
    // with an updated status badge rather than disappearing.
    const updatedRow = page.getByRole('row', { name: updatedNickname })
    await updatedRow.getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'Remove' }).click()
    await expect(updatedRow.getByText('removed')).toBeVisible({ timeout: 10_000 })
  })

  test('required-field validation blocks creating an incomplete tree', async ({ page }) => {
    await page.goto('/ngo/dashboard/trees')
    await page.getByRole('button', { name: 'New tree' }).click()
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('Tree nickname is required')).toBeVisible()
    await expect(page.getByText('Species is required')).toBeVisible()
  })

  test('releasing an adopted tree with a reason returns it to available', async ({ page }) => {
    await page.goto('/ngo/dashboard/trees')
    // Search first — a growing trees list (from other CRUD runs) can push
    // this older, seeded row off the default first page.
    await page.getByPlaceholder('Search trees…').fill('E2E Seed')
    await expect(page.getByText('E2E Seed Tree')).toBeVisible({ timeout: 10_000 })
    const row = page.getByRole('row', { name: /E2E Seed Tree/ })
    await expect(row.getByText('adopted')).toBeVisible()
    await expect(row.getByText('E2E Donor')).toBeVisible()

    await row.getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'Release adoption' }).click()
    await page.getByLabel('Reason (optional, for your records)', { exact: false }).fill('Tree relocated by e2e spec.')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Release adoption' }).click()
    await expect(row.getByText('available')).toBeVisible({ timeout: 10_000 })
    // Fixture healing (re-adopting this row) happens in seed_e2e.ts on the
    // next run's global-setup — not restored here, so this stays the only
    // test in the suite allowed to mutate the seeded tree's adoption state.
  })

  test('search filters the trees list by nickname', async ({ page }) => {
    await page.goto('/ngo/dashboard/trees')
    await page.getByPlaceholder('Search trees…').fill('E2E Seed')
    await expect(page.getByText(/E2E Seed Tree/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/^Playwright Tree/)).toHaveCount(0)
  })
})
