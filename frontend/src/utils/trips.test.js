import { describe, expect, it } from 'vitest'
import { filterTrips, sortTrips } from './trips.js'

const trips = [
  { _id: '1', name: 'Kyoto temples', destination: 'Japan', description: 'Autumn leaves', startDate: '2026-11-02T00:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z' },
  { _id: '2', name: 'alpine hiking', destination: 'New Zealand', description: '', startDate: '2026-02-10T00:00:00.000Z', createdAt: '2026-09-03T00:00:00.000Z' },
  { _id: '3', name: 'Harbour weekend', destination: 'Sydney', startDate: '2026-06-20T00:00:00.000Z', createdAt: '2026-09-02T00:00:00.000Z' },
]

function names(list) {
  return list.map((trip) => trip.name)
}

describe('trip list helpers', () => {
  it('returns every trip for an empty search', () => {
    expect(filterTrips(trips, '   ')).toBe(trips)
  })

  it('searches names, destinations, and descriptions without regard to case', () => {
    expect(names(filterTrips(trips, 'SYDNEY'))).toEqual(['Harbour weekend'])
    expect(names(filterTrips(trips, 'autumn'))).toEqual(['Kyoto temples'])
    expect(names(filterTrips(trips, 'hiking zealand'))).toEqual(['alpine hiking'])
    expect(filterTrips(trips, 'paris')).toEqual([])
  })

  it('sorts by when the trip was added, its start date, or its name', () => {
    expect(names(sortTrips(trips, 'newest'))).toEqual(['alpine hiking', 'Harbour weekend', 'Kyoto temples'])
    expect(names(sortTrips(trips, 'start-asc'))).toEqual(['alpine hiking', 'Harbour weekend', 'Kyoto temples'])
    expect(names(sortTrips(trips, 'start-desc'))).toEqual(['Kyoto temples', 'Harbour weekend', 'alpine hiking'])
    expect(names(sortTrips(trips, 'name'))).toEqual(['alpine hiking', 'Harbour weekend', 'Kyoto temples'])
  })

  it('does not reorder the original list', () => {
    sortTrips(trips, 'start-desc')
    expect(trips[0].name).toBe('Kyoto temples')
  })
})
