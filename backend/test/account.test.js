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

const tripInput = {
  name: 'Coastal drive',
  destination: 'Great Ocean Road',
  startDate: '2026-10-10',
  endDate: '2026-10-12',
}

async function register(name, email, password = 'secure-password') {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password })
    .expect(201)

  return response.body
}

function createTrip(token) {
  return request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${token}`)
    .send(tripInput)
    .expect(201)
}

test('changes a password and signs out sessions that used the old one', async () => {
  const account = await register('Aisha Traveller', 'aisha@example.com')

  await request(app)
    .put('/api/auth/account/password')
    .send({ currentPassword: 'secure-password', newPassword: 'a-better-password' })
    .expect(401)

  await request(app)
    .put('/api/auth/account/password')
    .set('Authorization', `Bearer ${account.token}`)
    .send({ currentPassword: 'not-my-password', newPassword: 'a-better-password' })
    .expect(403)
    .expect(({ body }) => assert.equal(body.error, 'Current password is incorrect.'))

  await request(app)
    .put('/api/auth/account/password')
    .set('Authorization', `Bearer ${account.token}`)
    .send({ currentPassword: 'secure-password', newPassword: 'short' })
    .expect(400)

  await request(app)
    .put('/api/auth/account/password')
    .set('Authorization', `Bearer ${account.token}`)
    .send({ currentPassword: 'secure-password', newPassword: 'secure-password' })
    .expect(400)

  const changed = await request(app)
    .put('/api/auth/account/password')
    .set('Authorization', `Bearer ${account.token}`)
    .send({ currentPassword: 'secure-password', newPassword: 'a-better-password' })
    .expect(200)

  assert.equal(changed.body.user.email, 'aisha@example.com')
  assert.equal(changed.body.user.passwordHash, undefined)
  assert.notEqual(changed.body.token, account.token)

  // The token issued before the change no longer works; the new one does.
  await request(app).get('/api/trips').set('Authorization', `Bearer ${account.token}`).expect(401)
  await request(app).get('/api/auth/me').set('Authorization', `Bearer ${account.token}`).expect(401)
  await request(app).get('/api/trips').set('Authorization', `Bearer ${changed.body.token}`).expect(200)

  await request(app)
    .post('/api/auth/login')
    .send({ email: 'aisha@example.com', password: 'secure-password' })
    .expect(401)

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'aisha@example.com', password: 'a-better-password' })
    .expect(200)

  await request(app).get('/api/trips').set('Authorization', `Bearer ${login.body.token}`).expect(200)
})

test('deletes an account with its trips and entries, and nothing else', async () => {
  const leaving = await register('Leaving Traveller', 'leaving@example.com')
  const staying = await register('Staying Traveller', 'staying@example.com')

  const trip = await createTrip(leaving.token)
  await createTrip(staying.token)

  await request(app)
    .post(`/api/trips/${trip.body._id}/entries`)
    .set('Authorization', `Bearer ${leaving.token}`)
    .send({ title: 'First day', content: 'Drove along the coast.', entryDate: '2026-10-10' })
    .expect(201)

  await request(app)
    .delete('/api/auth/account')
    .set('Authorization', `Bearer ${leaving.token}`)
    .send({})
    .expect(400)

  await request(app)
    .delete('/api/auth/account')
    .set('Authorization', `Bearer ${leaving.token}`)
    .send({ password: 'not-my-password' })
    .expect(403)

  assert.equal(await Trip.countDocuments(), 2)

  await request(app)
    .delete('/api/auth/account')
    .set('Authorization', `Bearer ${leaving.token}`)
    .send({ password: 'secure-password' })
    .expect(200)
    .expect(({ body }) => {
      assert.equal(body.deletedTrips, 1)
      assert.equal(body.deletedEntries, 1)
    })

  assert.equal(await User.countDocuments({ email: 'leaving@example.com' }), 0)
  assert.equal(await Entry.countDocuments(), 0)
  assert.equal(await Trip.countDocuments(), 1)

  // The deleted account's token stops working straight away.
  await request(app).get('/api/trips').set('Authorization', `Bearer ${leaving.token}`).expect(401)
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'leaving@example.com', password: 'secure-password' })
    .expect(401)

  await request(app)
    .get('/api/trips')
    .set('Authorization', `Bearer ${staying.token}`)
    .expect(200)
    .expect(({ body }) => assert.equal(body.length, 1))
})

test('accepts tokens issued before token versions were introduced', async () => {
  const account = await register('Early Member', 'early-member@example.com')
  await User.collection.updateOne({ email: 'early-member@example.com' }, { $unset: { tokenVersion: '' } })

  await request(app).get('/api/trips').set('Authorization', `Bearer ${account.token}`).expect(200)
})
