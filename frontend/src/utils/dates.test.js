import { describe, expect, it } from 'vitest'
import { formatDate, isOutsideTrip } from './dates.js'

const trip = { startDate: '2026-10-05T00:00:00.000Z', endDate: '2026-10-12T00:00:00.000Z' }

describe('date helpers', () => {
  it('formats a stored date without shifting it to another day', () => {
    expect(formatDate('2026-10-05T00:00:00.000Z')).toMatch(/\b5\b/)
    expect(formatDate('2026-10-05T00:00:00.000Z')).toMatch(/2026/)
  })

  it('recognises dates before and after the trip', () => {
    expect(isOutsideTrip('2026-10-04', trip)).toBe(true)
    expect(isOutsideTrip('2026-10-13', trip)).toBe(true)
  })

  it('accepts the first and last day of the trip', () => {
    expect(isOutsideTrip('2026-10-05', trip)).toBe(false)
    expect(isOutsideTrip('2026-10-12', trip)).toBe(false)
  })

  it('stays quiet until both a date and a trip are known', () => {
    expect(isOutsideTrip('', trip)).toBe(false)
    expect(isOutsideTrip('2026-10-04', undefined)).toBe(false)
  })
})
