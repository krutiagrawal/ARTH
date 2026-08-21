import { test, expect } from '@playwright/test'
import { TEST_NGO } from './global-setup'
import { loginAsNgo, logoutNgo } from './helpers'

test.describe('NGO auth', () => {
  test('happy path login reaches the dashboard', async ({ page }) => {
    await loginAsNgo(page, TEST_NGO)
    await expect(page).toHaveURL(/\/ngo\/dashboard$/)
  })

  test('wrong password shows an error and does not navigate', async ({ page }) => {
    await page.goto('/ngo/login')
    await page.getByLabel('Email').fill(TEST_NGO.email)
    await page.getByLabel('Password').fill('WrongPassword123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/ngo\/login/)
  })

  test('unknown email shows an error and does not navigate', async ({ page }) => {
    await page.goto('/ngo/login')
    await page.getByLabel('Email').fill('nobody-e2e@example.com')
    await page.getByLabel('Password').fill('WhateverPass123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/ngo\/login/)
  })

  test('unauthenticated visit to a dashboard route redirects to login with a next param, and login honors it', async ({ page }) => {
    await page.goto('/ngo/dashboard/drives')
    await page.waitForURL('**/ngo/login**')
    expect(new URL(page.url()).searchParams.get('next')).toBe('/ngo/dashboard/drives')

    await page.getByLabel('Email').fill(TEST_NGO.email)
    await page.getByLabel('Password').fill(TEST_NGO.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('**/ngo/dashboard/drives')
  })

  test('logout clears the session and dashboard becomes unreachable again', async ({ page }) => {
    await loginAsNgo(page, TEST_NGO)
    await logoutNgo(page)
    await expect(page).toHaveURL(/\/ngo\/login/)

    await page.goto('/ngo/dashboard')
    await page.waitForURL('**/ngo/login**')
  })
})
