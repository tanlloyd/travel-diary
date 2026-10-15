import { expect, test } from '@playwright/test'

const password = 'secure-password'

async function registerAccount(page, name) {
  const email = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}@example.com`

  await page.goto('/register')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/trips$/)

  return email
}

async function signIn(page, email, withPassword) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(withPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function openAsVisitor(browser, url) {
  const context = await browser.newContext()
  const visitor = await context.newPage()
  await visitor.goto(url)
  return { context, visitor }
}

test('sends a signed-out visitor to sign in instead of showing trips', async ({ page }) => {
  await page.goto('/trips')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('stops sharing a trip when its link is replaced or it is made private', async ({ page, browser }) => {
  await registerAccount(page, 'Privacy Traveller')

  await page.getByRole('button', { name: 'Create a trip', exact: true }).click()
  await page.getByLabel('Trip name').fill('Lisbon long weekend')
  await page.getByLabel('Destination').fill('Portugal')
  await page.getByLabel('Start date').fill('2026-11-06')
  await page.getByLabel('End date').fill('2026-11-09')
  await page.getByLabel('Make this trip public').check()
  await page.getByRole('button', { name: 'Save trip' }).click()
  await page.getByRole('article').filter({ hasText: 'Lisbon long weekend' })
    .getByRole('link', { name: /View trip/ }).click()

  const linkField = page.getByLabel('Public sharing link')
  const firstLink = await linkField.inputValue()
  expect(firstLink).toMatch(/\/shared\/trips\/[0-9a-f]{32}$/)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Create new link' }).click()
  await expect(page.getByText('New sharing link created.')).toBeVisible()
  const secondLink = await linkField.inputValue()
  expect(secondLink).not.toBe(firstLink)

  const replaced = await openAsVisitor(browser, firstLink)
  await expect(replaced.visitor.getByText('Shared trip not found.')).toBeVisible()
  await replaced.context.close()

  const current = await openAsVisitor(browser, secondLink)
  await expect(current.visitor.getByRole('heading', { name: 'Lisbon long weekend' })).toBeVisible()
  await current.context.close()

  await page.getByRole('button', { name: 'Edit trip' }).click()
  await page.getByLabel('Make this trip public').uncheck()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Private trip')).toBeVisible()
  await expect(page.getByLabel('Public sharing link')).toHaveCount(0)

  const hidden = await openAsVisitor(browser, secondLink)
  await expect(hidden.visitor.getByText('Shared trip not found.')).toBeVisible()
  await expect(hidden.visitor.getByRole('heading', { name: 'Lisbon long weekend' })).toHaveCount(0)
  await hidden.context.close()
})

test('changes the account password and refuses the old one', async ({ page }) => {
  const email = await registerAccount(page, 'Password Traveller')
  const newPassword = 'a-better-password'

  await page.getByRole('link', { name: 'Account', exact: true }).click()
  await expect(page.getByText(email)).toBeVisible()

  await page.getByLabel('Current password').fill(password)
  await page.getByLabel('New password', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirm new password').fill(newPassword)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Password changed.')).toBeVisible()

  // The session that changed the password stays signed in.
  await page.getByRole('link', { name: 'My trips', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'My trips', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()

  await signIn(page, email, password)
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.')

  await signIn(page, email, newPassword)
  await expect(page).toHaveURL(/\/trips$/)
})
