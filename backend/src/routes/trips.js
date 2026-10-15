import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import mongoose from 'mongoose'
import Entry from '../models/Entry.js'
import Trip from '../models/Trip.js'
import { isValidDate } from '../utils/dates.js'
import entriesRouter from './entries.js'

const tripsRouter = Router()

tripsRouter.param('tripId', async (request, response, next, tripId) => {
  if (!mongoose.isObjectIdOrHexString(tripId)) {
    return response.status(400).json({ error: 'Invalid trip ID.' })
  }

  const trip = await Trip.findOne({ _id: tripId, owner: request.userId })
  if (!trip) {
    return response.status(404).json({ error: 'Trip not found.' })
  }

  request.trip = trip
  next()
})

function createShareToken() {
  return randomBytes(16).toString('hex')
}

function validateTripInput(body) {
  const {
    name,
    destination,
    startDate,
    endDate,
    description = '',
    isPublic = false,
  } = body ?? {}

  if (
    typeof name !== 'string' || !name.trim() ||
    typeof destination !== 'string' || !destination.trim() ||
    !startDate || !endDate
  ) {
    return {
      error: 'Trip name, destination, start date, and end date are required.',
    }
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return { error: 'Use valid dates in YYYY-MM-DD format.' }
  }

  if (endDate < startDate) {
    return { error: 'End date cannot be before start date.' }
  }

  if (typeof description !== 'string') {
    return { error: 'Description must be text.' }
  }

  if (typeof isPublic !== 'boolean') {
    return { error: 'Trip visibility must be public or private.' }
  }

  return { value: { name, destination, startDate, endDate, description, isPublic } }
}

tripsRouter.get('/', async (request, response) => {
  const trips = await Trip.find({ owner: request.userId }).sort({ createdAt: -1, _id: -1 })
  response.status(200).json(trips)
})

tripsRouter.post('/', async (request, response) => {
  const result = validateTripInput(request.body)
  if (result.error) return response.status(400).json({ error: result.error })

  const trip = await Trip.create({
    ...result.value,
    owner: request.userId,
    ...(result.value.isPublic && { shareToken: createShareToken() }),
  })
  response.status(201).json(trip)
})

tripsRouter.get('/:tripId', (request, response) => {
  response.status(200).json(request.trip)
})

tripsRouter.put('/:tripId', async (request, response) => {
  const result = validateTripInput(request.body)
  if (result.error) return response.status(400).json({ error: result.error })

  // A trip that was already public before sharing tokens existed keeps its
  // original link until the owner asks for a new one.
  const isBecomingPublic = result.value.isPublic && !request.trip.isPublic
  if (isBecomingPublic && !request.trip.shareToken) {
    request.trip.shareToken = createShareToken()
  }

  request.trip.set(result.value)
  const trip = await request.trip.save()
  response.status(200).json(trip)
})

tripsRouter.post('/:tripId/share-link', async (request, response) => {
  if (!request.trip.isPublic) {
    return response.status(400).json({ error: 'Make the trip public before creating a sharing link.' })
  }

  request.trip.shareToken = createShareToken()
  const trip = await request.trip.save()
  response.status(200).json(trip)
})

tripsRouter.delete('/:tripId', async (request, response) => {
  const entryResult = await Entry.deleteMany({ trip: request.trip._id })
  await request.trip.deleteOne()

  response.status(200).json({
    message: 'Trip deleted.',
    deletedEntries: entryResult.deletedCount,
  })
})

tripsRouter.use('/:tripId/entries', entriesRouter)

export default tripsRouter
