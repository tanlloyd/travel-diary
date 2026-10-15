import { Router } from 'express'
import mongoose from 'mongoose'
import Entry from '../models/Entry.js'
import Trip from '../models/Trip.js'

const publicTripsRouter = Router()

const shareTokenPattern = /^[0-9a-f]{32}$/

publicTripsRouter.get('/:shareId', async (request, response) => {
  const { shareId } = request.params
  const isShareToken = shareTokenPattern.test(shareId)

  if (!isShareToken && !mongoose.isObjectIdOrHexString(shareId)) {
    return response.status(400).json({ error: 'Invalid sharing link.' })
  }

  // Links shared before sharing tokens existed used the trip ID. They keep
  // working only until the trip is given a token.
  const filter = isShareToken
    ? { shareToken: shareId, isPublic: true }
    : { _id: shareId, isPublic: true, shareToken: null }

  const trip = await Trip.findOne(filter).select('-owner')
  if (!trip) {
    return response.status(404).json({ error: 'Shared trip not found.' })
  }

  const entries = await Entry.find({ trip: trip._id })
    .select('-trip')
    .sort({ entryDate: 1, createdAt: 1, _id: 1 })

  response.status(200).json({ trip, entries })
})

export default publicTripsRouter
