import assert from 'node:assert/strict'
import { test } from 'node:test'
import request from 'supertest'
import app, { createApp } from '../src/app.js'
import { useMemoryDatabase } from '../test-support/memoryDatabase.js'

process.env.JWT_SECRET = 'automated-test-secret-with-at-least-32-characters'

useMemoryDatabase()

const account = { name: 'Careful Traveller', email: 'careful@example.com', password: 'secure-password' }

test('sends security headers that still allow map tiles, photos, and place search', async () => {
  const response = await request(app).get('/api/health').expect(200)
  const policy = response.headers['content-security-policy']

  assert.equal(response.headers['x-content-type-options'], 'nosniff')
  assert.equal(response.headers['x-powered-by'], undefined)
  assert.match(policy, /default-src 'self'/)
  assert.match(policy, /img-src 'self' data: blob: https:\/\/\*\.tile\.openstreetmap\.org/)
  assert.match(policy, /connect-src 'self' https:\/\/geocoding-api\.open-meteo\.com/)
  assert.doesNotMatch(policy, /upgrade-insecure-requests/)
})

test('blocks repeated failed sign-in attempts without penalising successful ones', async () => {
  const limitedApp = createApp({ authRateLimits: { loginLimit: 3 } })
  await request(limitedApp).post('/api/auth/register').send(account).expect(201)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await request(limitedApp)
      .post('/api/auth/login')
      .send({ email: account.email, password: account.password })
      .expect(200)
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await request(limitedApp)
      .post('/api/auth/login')
      .send({ email: account.email, password: 'wrong-password' })
      .expect(401)
  }

  await request(limitedApp)
    .post('/api/auth/login')
    .send({ email: account.email, password: 'wrong-password' })
    .expect(429)
    .expect(({ body }) => assert.match(body.error, /Too many sign-in attempts/))
})

test('limits how many accounts one client can create', async () => {
  const limitedApp = createApp({ authRateLimits: { registerLimit: 2 } })

  for (const email of ['first@example.com', 'second@example.com']) {
    await request(limitedApp).post('/api/auth/register').send({ ...account, email }).expect(201)
  }

  await request(limitedApp)
    .post('/api/auth/register')
    .send({ ...account, email: 'third@example.com' })
    .expect(429)
    .expect(({ body }) => assert.match(body.error, /Too many accounts/))
})

test('refuses large request bodies outside diary entries', async () => {
  await request(app)
    .post('/api/auth/login')
    .send({ email: account.email, password: 'x'.repeat(200 * 1024) })
    .expect(413)

  // Without a valid token the large body is never parsed.
  await request(app)
    .post('/api/trips')
    .send({ name: 'x'.repeat(200 * 1024) })
    .expect(401)
})
