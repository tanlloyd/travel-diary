import assert from 'node:assert/strict'
import { test } from 'node:test'
import request from 'supertest'
import app from '../src/app.js'
import Entry from '../src/models/Entry.js'
import Trip from '../src/models/Trip.js'
import User from '../src/models/User.js'
import { useMemoryDatabase } from '../test-support/memoryDatabase.js'

process.env.JWT_SECRET = 'automated-test-secret-with-at-least-32-characters'

useMemoryDatabase()

async function register(name, email) {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'secure-password' })
    .expect(201)

  return response.body
}

test('registers and authenticates an account without exposing its password hash', async () => {
  const registration = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Aisha Traveller', email: 'AISHA@example.com', password: 'secure-password' })
    .expect(201)

  assert.equal(registration.body.user.email, 'aisha@example.com')
  assert.equal(registration.body.user.passwordHash, undefined)
  assert.ok(registration.body.token)

  const savedUser = await User.findOne({ email: 'aisha@example.com' }).select('+passwordHash')
  assert.ok(savedUser.passwordHash)
  assert.notEqual(savedUser.passwordHash, 'secure-password')

  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Duplicate', email: 'aisha@example.com', password: 'another-password' })
    .expect(409)

  await request(app)
    .post('/api/auth/login')
    .send({ email: 'aisha@example.com', password: 'wrong-password' })
    .expect(401)

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'aisha@example.com', password: 'secure-password' })
    .expect(200)

  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`)
    .expect(200)
    .expect(({ body }) => {
      assert.equal(body.user.email, 'aisha@example.com')
    })

  await request(app).get('/api/trips').expect(401)
})

test('keeps trips and diary entries private to their owner', async () => {
  const owner = await register('Trip Owner', 'owner@example.com')
  const otherUser = await register('Other User', 'other@example.com')

  const tripResponse = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({
      name: 'Private trip',
      destination: 'Penang',
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      description: 'Owner-only plans',
    })
    .expect(201)

  const tripId = tripResponse.body._id

  await request(app)
    .get('/api/trips')
    .set('Authorization', `Bearer ${owner.token}`)
    .expect(200)
    .expect(({ body }) => assert.equal(body.length, 1))

  await request(app)
    .get('/api/trips')
    .set('Authorization', `Bearer ${otherUser.token}`)
    .expect(200)
    .expect(({ body }) => assert.deepEqual(body, []))

  await request(app)
    .get(`/api/trips/${tripId}`)
    .set('Authorization', `Bearer ${otherUser.token}`)
    .expect(404)

  await request(app)
    .post(`/api/trips/${tripId}/entries`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({
      title: 'First day',
      content: 'Explored the old town.',
      entryDate: '2026-10-10',
    })
    .expect(201)

  await request(app)
    .get(`/api/trips/${tripId}/entries`)
    .set('Authorization', `Bearer ${otherUser.token}`)
    .expect(404)

  await request(app)
    .delete(`/api/trips/${tripId}`)
    .set('Authorization', `Bearer ${owner.token}`)
    .expect(200)
    .expect(({ body }) => assert.equal(body.deletedEntries, 1))

  assert.equal(await Trip.countDocuments(), 0)
  assert.equal(await Entry.countDocuments(), 0)
})

test('shares only public trips through the read-only public endpoint', async () => {
  const owner = await register('Sharing Traveller', 'sharing@example.com')
  const tripInput = {
    name: 'Shareable journey',
    destination: 'Hobart',
    startDate: '2026-11-02',
    endDate: '2026-11-05',
    description: 'A trip that can be shared.',
  }

  const createdTrip = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(tripInput)
    .expect(201)

  assert.equal(createdTrip.body.isPublic, false)

  await request(app)
    .post(`/api/trips/${createdTrip.body._id}/entries`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({
      title: 'Waterfront walk',
      content: 'Visited the harbour after breakfast.',
      entryDate: '2026-11-03',
    })
    .expect(201)

  await request(app)
    .get(`/api/public/trips/${createdTrip.body._id}`)
    .expect(404)

  const publishedTrip = await request(app)
    .put(`/api/trips/${createdTrip.body._id}`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ ...tripInput, isPublic: true })
    .expect(200)

  assert.equal(publishedTrip.body.isPublic, true)
  assert.match(publishedTrip.body.shareToken, /^[0-9a-f]{32}$/)
  const shareToken = publishedTrip.body.shareToken

  await request(app)
    .get(`/api/public/trips/${shareToken}`)
    .expect(200)
    .expect(({ body }) => {
      assert.equal(body.trip.name, tripInput.name)
      assert.equal(body.trip.isPublic, true)
      assert.equal(body.trip.owner, undefined)
      assert.equal(body.entries.length, 1)
      assert.equal(body.entries[0].title, 'Waterfront walk')
      assert.equal(body.entries[0].trip, undefined)
    })

  // The trip ID alone is not a sharing link.
  await request(app)
    .get(`/api/public/trips/${createdTrip.body._id}`)
    .expect(404)

  await request(app)
    .put(`/api/trips/${createdTrip.body._id}`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ ...tripInput, isPublic: false })
    .expect(200)

  await request(app)
    .get(`/api/public/trips/${shareToken}`)
    .expect(404)

  // Sharing the trip again restores the link people already have.
  await request(app)
    .put(`/api/trips/${createdTrip.body._id}`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ ...tripInput, isPublic: true })
    .expect(200)
    .expect(({ body }) => assert.equal(body.shareToken, shareToken))

  await request(app)
    .get('/api/public/trips/not-a-valid-id')
    .expect(400)
})

test('replaces a sharing link so the previous one stops working', async () => {
  const owner = await register('Careful Sharer', 'careful-sharer@example.com')
  const otherUser = await register('Curious Visitor', 'curious@example.com')
  const tripInput = {
    name: 'Family reunion',
    destination: 'Adelaide',
    startDate: '2026-12-20',
    endDate: '2026-12-27',
  }

  const publicTrip = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ ...tripInput, isPublic: true })
    .expect(201)
  const firstToken = publicTrip.body.shareToken
  assert.match(firstToken, /^[0-9a-f]{32}$/)

  await request(app)
    .post(`/api/trips/${publicTrip.body._id}/share-link`)
    .set('Authorization', `Bearer ${otherUser.token}`)
    .expect(404)

  const replaced = await request(app)
    .post(`/api/trips/${publicTrip.body._id}/share-link`)
    .set('Authorization', `Bearer ${owner.token}`)
    .expect(200)
  assert.notEqual(replaced.body.shareToken, firstToken)

  await request(app).get(`/api/public/trips/${firstToken}`).expect(404)
  await request(app).get(`/api/public/trips/${replaced.body.shareToken}`).expect(200)

  const privateTrip = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(tripInput)
    .expect(201)
  assert.equal(privateTrip.body.shareToken, undefined)

  await request(app)
    .post(`/api/trips/${privateTrip.body._id}/share-link`)
    .set('Authorization', `Bearer ${owner.token}`)
    .expect(400)
})

test('keeps links to trips shared before sharing tokens until they are replaced', async () => {
  const owner = await register('Early Sharer', 'early@example.com')
  const user = await User.findOne({ email: 'early@example.com' })
  const legacyTrip = await Trip.create({
    owner: user._id,
    name: 'Shared last month',
    destination: 'Perth',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    isPublic: true,
  })

  await request(app).get(`/api/public/trips/${legacyTrip._id}`).expect(200)

  // Editing the trip must not silently break the link people already have.
  await request(app)
    .put(`/api/trips/${legacyTrip._id}`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({
      name: 'Shared last month, renamed',
      destination: 'Perth',
      startDate: '2026-09-01',
      endDate: '2026-09-05',
      isPublic: true,
    })
    .expect(200)
    .expect(({ body }) => assert.equal(body.shareToken, undefined))

  await request(app).get(`/api/public/trips/${legacyTrip._id}`).expect(200)

  const replaced = await request(app)
    .post(`/api/trips/${legacyTrip._id}/share-link`)
    .set('Authorization', `Bearer ${owner.token}`)
    .expect(200)

  await request(app).get(`/api/public/trips/${legacyTrip._id}`).expect(404)
  await request(app).get(`/api/public/trips/${replaced.body.shareToken}`).expect(200)
})

test('saves and refreshes weather for a mapped diary entry', async () => {
  const account = await register('Weather Traveller', 'weather@example.com')
  const tripResponse = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${account.token}`)
    .send({
      name: 'Sydney weekend',
      destination: 'Sydney',
      startDate: '2025-10-04',
      endDate: '2025-10-05',
      description: 'A mapped trip',
    })
    .expect(201)

  const originalFetch = globalThis.fetch
  let conditionCode = 2
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      daily: {
        time: ['2025-10-04'],
        weather_code: [conditionCode],
        temperature_2m_max: [23.7],
        temperature_2m_min: [13.8],
        precipitation_sum: [0.4],
      },
    }),
  })

  try {
    const created = await request(app)
      .post(`/api/trips/${tripResponse.body._id}/entries`)
      .set('Authorization', `Bearer ${account.token}`)
      .send({
        title: 'Harbour walk',
        content: 'Walked around Circular Quay.',
        entryDate: '2025-10-04',
        locationName: 'Sydney',
        latitude: -33.8688,
        longitude: 151.2093,
      })
      .expect(201)

    assert.equal(created.body.weather.condition, 'Partly cloudy')
    assert.equal(created.body.weather.temperatureMax, 23.7)
    assert.equal(created.body.weather.source, 'Open-Meteo')

    conditionCode = 0
    await request(app)
      .post(`/api/trips/${tripResponse.body._id}/entries/${created.body._id}/weather`)
      .set('Authorization', `Bearer ${account.token}`)
      .expect(200)
      .expect(({ body }) => assert.equal(body.weather.condition, 'Clear sky'))

    const savedEntry = await Entry.findById(created.body._id)
    assert.equal(savedEntry.weather.condition, 'Clear sky')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('validates, saves, updates, and removes diary entry photos', async () => {
  const account = await register('Photo Traveller', 'photos@example.com')
  const tripResponse = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${account.token}`)
    .send({
      name: 'Photo trip',
      destination: 'Sydney',
      startDate: '2026-10-04',
      endDate: '2026-10-05',
      description: 'A trip with photos',
    })
    .expect(201)

  const photoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  const entryInput = {
    title: 'Harbour photo',
    content: 'Saved a photo from Circular Quay.',
    entryDate: '2026-10-04',
    locationName: 'Sydney',
    photos: [{ dataUrl: photoDataUrl, alt: 'Sydney harbour' }],
  }

  const created = await request(app)
    .post(`/api/trips/${tripResponse.body._id}/entries`)
    .set('Authorization', `Bearer ${account.token}`)
    .send(entryInput)
    .expect(201)

  assert.equal(created.body.photos.length, 1)
  assert.equal(created.body.photos[0].dataUrl, photoDataUrl)
  assert.equal(created.body.photos[0].alt, 'Sydney harbour')

  const savedEntry = await Entry.findById(created.body._id)
  assert.equal(savedEntry.photos[0].alt, 'Sydney harbour')

  await request(app)
    .put(`/api/trips/${tripResponse.body._id}/entries/${created.body._id}`)
    .set('Authorization', `Bearer ${account.token}`)
    .send({ ...entryInput, photos: [] })
    .expect(200)
    .expect(({ body }) => assert.deepEqual(body.photos, []))

  await request(app)
    .post(`/api/trips/${tripResponse.body._id}/entries`)
    .set('Authorization', `Bearer ${account.token}`)
    .send({
      ...entryInput,
      title: 'Unsupported photo',
      photos: [{ dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', alt: '' }],
    })
    .expect(400)
    .expect(({ body }) => assert.match(body.error, /JPEG, PNG, or WebP/))
})

test('indexes diary entries by trip and date', () => {
  const indexedPaths = Entry.schema.indexes().map(([fields]) => Object.keys(fields).join(','))
  assert.ok(indexedPaths.includes('trip,entryDate,createdAt'))
})
