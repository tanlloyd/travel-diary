import { Router } from 'express'
import mongoose from 'mongoose'
import Entry from '../models/Entry.js'
import { getWeatherForEntry } from '../services/weather.js'
import { isValidDate } from '../utils/dates.js'

const entriesRouter = Router({ mergeParams: true })
const MAX_PHOTOS = 3
const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const photoDataUrlPattern = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/

function validateEntryInput(body) {
  const {
    title, content, entryDate, locationName = '', latitude = null, longitude = null,
    photos = [],
  } = body ?? {}

  if (
    typeof title !== 'string' || !title.trim() ||
    typeof content !== 'string' || !content.trim() || !entryDate
  ) {
    return { error: 'Title, content, and entry date are required.' }
  }

  if (!isValidDate(entryDate)) {
    return { error: 'Use a valid entry date in YYYY-MM-DD format.' }
  }

  if (typeof locationName !== 'string') {
    return { error: 'Location name must be text.' }
  }

  if ((latitude == null) !== (longitude == null)) {
    return { error: 'Provide both latitude and longitude, or leave both blank.' }
  }

  if (latitude != null && (!Number.isFinite(latitude) || !Number.isFinite(longitude))) {
    return { error: 'Latitude and longitude must be numbers.' }
  }

  if (!Array.isArray(photos)) {
    return { error: 'Photos must be provided as a list.' }
  }

  if (photos.length > MAX_PHOTOS) {
    return { error: `Add no more than ${MAX_PHOTOS} photos to an entry.` }
  }

  const validatedPhotos = []
  for (const photo of photos) {
    if (!photo || typeof photo !== 'object' || typeof photo.dataUrl !== 'string') {
      return { error: 'Each photo must be a JPEG, PNG, or WebP image.' }
    }

    const match = photo.dataUrl.match(photoDataUrlPattern)
    if (!match || match[2].length % 4 !== 0) {
      return { error: 'Each photo must be a JPEG, PNG, or WebP image.' }
    }

    const byteLength = Buffer.from(match[2], 'base64').byteLength
    if (byteLength > MAX_PHOTO_BYTES) {
      return { error: 'Each photo must be 2 MB or smaller.' }
    }

    const alt = photo.alt ?? ''
    if (typeof alt !== 'string' || alt.length > 200) {
      return { error: 'Photo descriptions must be 200 characters or fewer.' }
    }

    validatedPhotos.push({ dataUrl: photo.dataUrl, alt: alt.trim() })
  }

  return {
    value: {
      title, content, entryDate, locationName, latitude, longitude, photos: validatedPhotos,
    },
  }
}

async function weatherForEntry(value) {
  if (value.latitude == null || value.longitude == null) return null

  try {
    return await getWeatherForEntry(value)
  } catch (error) {
    console.error('Unable to retrieve weather:', error.message)
    return null
  }
}

entriesRouter.param('entryId', async (request, response, next, entryId) => {
  if (!mongoose.isObjectIdOrHexString(entryId)) {
    return response.status(400).json({ error: 'Invalid entry ID.' })
  }

  const entry = await Entry.findOne({ _id: entryId, trip: request.trip._id })
  if (!entry) {
    return response.status(404).json({ error: 'Entry not found.' })
  }

  request.entry = entry
  next()
})

entriesRouter.get('/', async (request, response) => {
  const entries = await Entry.find({ trip: request.trip._id })
    .sort({ entryDate: 1, createdAt: 1, _id: 1 })
  response.status(200).json(entries)
})

entriesRouter.post('/', async (request, response) => {
  const result = validateEntryInput(request.body)
  if (result.error) return response.status(400).json({ error: result.error })

  const weather = await weatherForEntry(result.value)
  const entry = await Entry.create({
    trip: request.trip._id,
    ...result.value,
    weather,
  })
  response.status(201).json(entry)
})

entriesRouter.put('/:entryId', async (request, response) => {
  const result = validateEntryInput(request.body)
  if (result.error) return response.status(400).json({ error: result.error })

  const previousDate = request.entry.entryDate.toISOString().slice(0, 10)
  const weatherInputsChanged = (
    previousDate !== result.value.entryDate ||
    request.entry.latitude !== result.value.latitude ||
    request.entry.longitude !== result.value.longitude
  )
  const weather = weatherInputsChanged
    ? await weatherForEntry(result.value)
    : request.entry.weather

  request.entry.set({ ...result.value, weather })
  const entry = await request.entry.save()
  response.status(200).json(entry)
})

entriesRouter.post('/:entryId/weather', async (request, response) => {
  if (request.entry.latitude == null || request.entry.longitude == null) {
    return response.status(400).json({ error: 'Add coordinates before retrieving weather.' })
  }

  let weather
  try {
    weather = await getWeatherForEntry(request.entry)
  } catch {
    return response.status(503).json({ error: 'Weather is temporarily unavailable. Please try again.' })
  }

  if (!weather) {
    return response.status(422).json({
      error: 'Weather is not available for this entry date yet.',
    })
  }

  request.entry.weather = weather
  const entry = await request.entry.save()
  response.status(200).json(entry)
})

entriesRouter.delete('/:entryId', async (request, response) => {
  await request.entry.deleteOne()
  response.status(200).json(request.entry)
})

export default entriesRouter
