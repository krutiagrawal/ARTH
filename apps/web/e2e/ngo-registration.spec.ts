import { test, expect } from '@playwright/test'
import { TEST_NGO } from './global-setup'

function uniqueNgo() {
  const id = Date.now()
  return {
    email: `e2e_reg_${id}@example.com`,
    password: 'RegPass123!',
    name: 'Registration Test',
    handle: `e2e_reg_${id}`,
    orgName: `E2E Registration Org ${id}`,
    website: '',
    contactPhone: '',
  }
}

async function fillRegisterForm(page: import('@playwright/test').Page, ngo: ReturnType<typeof uniqueNgo>) {
  await page.getByLabel('Organization name').fill(ngo.orgName)
  await page.getByLabel('About your organization').fill('A great organization doing great things.')
  await page.getByLabel('Your name').fill(ngo.name)
  await page.getByLabel('Handle').fill(ngo.handle)
  await page.getByLabel('Email').fill(ngo.email)
  await page.getByLabel('Password').fill(ngo.password)
}

test.describe('NGO registration', () => {
  test('happy path shows a confirmation and reaches the dashboard', async ({ page }) => {
    const ngo = uniqueNgo()
    await page.goto('/ngo/register')
    await fillRegisterForm(page, ngo)
    await page.getByRole('button', { name: /submit for review/i }).click()

    await expect(page.getByText(`Thank you, ${ngo.orgName}.`, { exact: false })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('link', { name: /go to your dashboard/i }).click()
    await page.waitForURL('**/ngo/dashboard')
    await expect(page.getByRole('heading', { name: `Welcome back, ${ngo.orgName}.` })).toBeVisible()
  })

  test('missing required field blocks submission', async ({ page }) => {
    const ngo = uniqueNgo()
    await page.goto('/ngo/register')
    await fillRegisterForm(page, ngo)
    await page.getByLabel('Organization name').fill('')
    await page.getByRole('button', { name: /submit for review/i }).click()
    // Native HTML5 required validation blocks the fetch entirely — no confirmation, no navigation.
    await expect(page.getByRole('button', { name: /submit for review/i })).toBeVisible()
    await expect(page.getByText('Thank you,', { exact: false })).toHaveCount(0)
  })

  test('invalid handle characters are rejected server-side', async ({ page }) => {
    const ngo = uniqueNgo()
    ngo.handle = 'Invalid Handle!!'
    await page.goto('/ngo/register')
    await fillRegisterForm(page, ngo)
    await page.getByRole('button', { name: /submit for review/i }).click()
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Thank you,', { exact: false })).toHaveCount(0)
  })

  test('non-URL website is rejected server-side', async ({ page }) => {
    const ngo = uniqueNgo()
    await page.goto('/ngo/register')
    await fillRegisterForm(page, ngo)
    await page.getByLabel('Website (optional)').fill('not-a-url')
    await page.getByRole('button', { name: /submit for review/i }).click()
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Thank you,', { exact: false })).toHaveCount(0)
  })

  test('duplicate email is rejected', async ({ page }) => {
    const ngo = uniqueNgo()
    ngo.email = TEST_NGO.email
    await page.goto('/ngo/register')
    await fillRegisterForm(page, ngo)
    await page.getByRole('button', { name: /submit for review/i }).click()
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Thank you,', { exact: false })).toHaveCount(0)
  })

  test('duplicate handle is rejected', async ({ page }) => {
    const ngo = uniqueNgo()
    ngo.handle = TEST_NGO.handle
    await page.goto('/ngo/register')
    await fillRegisterForm(page, ngo)
    await page.getByRole('button', { name: /submit for review/i }).click()
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Thank you,', { exact: false })).toHaveCount(0)
  })
})
