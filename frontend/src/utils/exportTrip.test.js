import { describe, expect, it } from 'vitest'
import { buildTripExport, exportFileName } from './exportTrip.js'

const trip = {
  _id: 'trip-1',
  owner: 'user-1',
  shareToken: '0123456789abcdef0123456789abcdef',
  name: 'Japan autumn journey',
  destination: 'Japan',
  startDate: '2026-10-05T00:00:00.000Z',
  endDate: '2026-10-12T00:00:00.000Z',
  isPublic: true,
}

const entries = [{
  _id: 'entry-1',
  trip: 'trip-1',
  title: 'Tokyo arrival',
  content: 'Explored the city after checking in.',
  entryDate: '2026-10-06T00:00:00.000Z',
  locationName: 'Tokyo',
  latitude: 35.6895,
  longitude: 139.6917,
  weather: { code: 2, condition: 'Partly cloudy', temperatureMax: 22.1, temperatureMin: 15.4, precipitation: 0, source: 'Open-Meteo', fetchedAt: '2026-10-06T09:00:00.000Z' },
  photos: [{ dataUrl: 'data:image/jpeg;base64,AAAA', alt: 'Shibuya crossing' }],
}, {
  _id: 'entry-2',
  title: 'Quiet morning',
  content: 'Stayed in and wrote postcards.',
  entryDate: '2026-10-07T00:00:00.000Z',
}]

describe('trip export', () => {
  it('keeps the diary content and leaves out internal identifiers', () => {
    const exported = buildTripExport(trip, entries, new Date('2026-10-20T03:04:05.000Z'))

    expect(exported).toMatchObject({
      format: 'travel-diary-trip',
      version: 1,
      exportedAt: '2026-10-20T03:04:05.000Z',
      trip: { name: 'Japan autumn journey', startDate: '2026-10-05', endDate: '2026-10-12', description: '' },
    })
    expect(exported.entries[0]).toEqual({
      title: 'Tokyo arrival',
      content: 'Explored the city after checking in.',
      entryDate: '2026-10-06',
      locationName: 'Tokyo',
      latitude: 35.6895,
      longitude: 139.6917,
      weather: { condition: 'Partly cloudy', temperatureMax: 22.1, temperatureMin: 15.4, precipitation: 0, source: 'Open-Meteo' },
      photos: [{ description: 'Shibuya crossing', dataUrl: 'data:image/jpeg;base64,AAAA' }],
    })

    const text = JSON.stringify(exported)
    expect(text).not.toContain('trip-1')
    expect(text).not.toContain('user-1')
    expect(text).not.toContain(trip.shareToken)
  })

  it('fills in empty values for an entry without a place, weather, or photos', () => {
    const exported = buildTripExport(trip, entries)

    expect(exported.entries[1]).toMatchObject({
      locationName: '',
      latitude: null,
      longitude: null,
      weather: null,
      photos: [],
    })
  })

  it('names the file after the trip', () => {
    expect(exportFileName(trip)).toBe('japan-autumn-journey-travel-diary.json')
    expect(exportFileName({ name: '  Café & Bar: Paris/Lyon!  ' })).toBe('cafe-bar-parislyon-travel-diary.json')
    expect(exportFileName({ name: '東京' })).toBe('trip-travel-diary.json')
  })
})
