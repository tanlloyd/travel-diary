import { expect, test } from '@playwright/test'

test('creates and publicly shares a trip with a replayable diary', async ({ page }) => {
  const uniqueEmail = `browser-${Date.now()}@example.com`

  await page.goto('/register')
  await page.getByLabel('Name').fill('Browser Test Traveller')
  await page.getByLabel('Email').fill(uniqueEmail)
  await page.getByLabel('Password', { exact: true }).fill('secure-password')
  await page.getByLabel('Confirm password').fill('secure-password')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/trips$/)
  await expect(page.getByText('Signed in as Browser Test Traveller')).toBeVisible()

  await page.getByRole('button', { name: 'Create a trip', exact: true }).click()
  await page.getByLabel('Trip name').fill('Japan autumn journey')
  await page.getByLabel('Destination').fill('Japan')
  await page.getByLabel('Start date').fill('2026-10-05')
  await page.getByLabel('End date').fill('2026-10-12')
  await page.getByLabel('Description (optional)').fill('A public diary created by the browser smoke test.')
  await page.getByLabel('Make this trip public').check()
  await page.getByRole('button', { name: 'Save trip' }).click()

  await expect(page.getByText('Trip saved.')).toBeVisible()
  const tripCard = page.getByRole('article').filter({ hasText: 'Japan autumn journey' })
  await expect(tripCard.getByText('Public', { exact: true })).toBeVisible()
  await tripCard.getByRole('link', { name: /View trip/ }).click()

  await expect(page.getByRole('heading', { name: 'Japan autumn journey' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Share this trip' })).toBeVisible()

  async function createEntry({ title, content, date, location }) {
    await page.getByLabel('Title', { exact: true }).fill(title)
    await page.getByLabel('Content', { exact: true }).fill(content)
    await page.getByLabel('Entry date').fill(date)
    await page.getByLabel('Location name (optional)').fill(location)
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByText('Entry saved.')).toBeVisible()
  }

  await createEntry({
    title: 'Tokyo arrival',
    content: 'Explored the city after checking in.',
    date: '2026-10-06',
    location: 'Tokyo',
  })
  await createEntry({
    title: 'Kyoto temples',
    content: 'Walked through the old streets and temple gardens.',
    date: '2026-10-08',
    location: 'Kyoto',
  })

  const replay = page.getByRole('region', { name: 'Replay this trip' })
  await expect(page.getByText('Memory 1 of 2')).toBeVisible()
  await expect(replay.getByRole('heading', { name: 'Tokyo arrival' })).toBeVisible()
  await replay.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Memory 2 of 2')).toBeVisible()
  await expect(replay.getByRole('heading', { name: 'Kyoto temples' })).toBeVisible()

  const sharingLink = await page.getByLabel('Public sharing link').inputValue()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()

  await page.goto(sharingLink)
  await expect(page.getByText('Shared journey')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Japan autumn journey' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tokyo arrival' }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Kyoto temples' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)
})
