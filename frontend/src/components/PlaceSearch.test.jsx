import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CreateEntryForm from './CreateEntryForm.jsx'
import EditEntryForm from './EditEntryForm.jsx'

vi.mock('../services/api.js', () => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
}))

import { createEntry, updateEntry } from '../services/api.js'

const places = [
  { id: 1, name: 'Sydney', admin1: 'New South Wales', country: 'Australia', latitude: -33.8678, longitude: 151.2073 },
  { id: 2, name: 'Sydney', admin1: 'Nova Scotia', country: 'Canada', latitude: 46.1368, longitude: -60.1942 },
]

function placeResponse(results) {
  return { ok: true, json: async () => ({ results }) }
}

describe('place search in diary forms', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('fills coordinates from the chosen place when creating an entry', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(placeResponse(places))
    createEntry.mockResolvedValue({ _id: 'new-entry' })
    const onCreated = vi.fn()
    render(<CreateEntryForm tripId="trip-1" onCreated={onCreated} />)

    await user.type(screen.getByLabelText('Title'), 'Harbour walk')
    await user.type(screen.getByLabelText('Content'), 'A day in the city')
    fireEvent.change(screen.getByLabelText('Entry date'), { target: { value: '2026-10-05' } })
    await user.type(screen.getByLabelText('Find a city or place (optional)'), 'Sydney')
    await user.click(screen.getByRole('button', { name: 'Find place' }))

    expect(await screen.findByRole('button', { name: 'Sydney, New South Wales, Australia' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sydney, Nova Scotia, Canada' }))
    expect(screen.getByLabelText('Location name (optional)')).toHaveValue('Sydney, Nova Scotia, Canada')
    expect(screen.getByLabelText('Latitude (optional)')).toHaveValue(46.1368)
    expect(screen.getByLabelText('Longitude (optional)')).toHaveValue(-60.1942)

    await user.click(screen.getByRole('button', { name: 'Save entry' }))
    expect(createEntry).toHaveBeenCalledWith('trip-1', expect.objectContaining({
      locationName: 'Sydney, Nova Scotia, Canada', latitude: 46.1368, longitude: -60.1942,
    }))
    expect(onCreated).toHaveBeenCalledWith({ _id: 'new-entry' })
    expect(screen.getByLabelText('Find a city or place (optional)')).toHaveValue('')
  })

  it('replaces existing coordinates when editing an entry', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(placeResponse(places))
    updateEntry.mockResolvedValue({ _id: 'entry-1' })
    const entry = {
      _id: 'entry-1', title: 'Old title', content: 'Old text',
      entryDate: '2026-10-05T00:00:00.000Z', locationName: 'Melbourne',
      latitude: -37.8136, longitude: 144.9631, photos: [],
    }
    render(<EditEntryForm tripId="trip-1" entry={entry} onUpdated={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Find a city or place (optional)'), 'Sydney')
    await user.click(screen.getByRole('button', { name: 'Find place' }))
    await user.click(await screen.findByRole('button', { name: 'Sydney, New South Wales, Australia' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateEntry).toHaveBeenCalledWith('trip-1', 'entry-1', expect.objectContaining({
      locationName: 'Sydney, New South Wales, Australia', latitude: -33.8678, longitude: 151.2073,
    }))
  })

  it('keeps manual coordinates available when the place service fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    render(<CreateEntryForm tripId="trip-1" onCreated={vi.fn()} />)

    await user.type(screen.getByLabelText('Find a city or place (optional)'), 'Kyoto')
    await user.click(screen.getByRole('button', { name: 'Find place' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Place search is unavailable')
    expect(screen.getByLabelText('Latitude (optional)')).toBeEnabled()
    expect(screen.getByLabelText('Longitude (optional)')).toBeEnabled()
  })
})

describe('current location in diary forms', () => {
  function stubGeolocation(getCurrentPosition) {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: vi.fn(getCurrentPosition) },
    })
  }

  afterEach(() => {
    delete navigator.geolocation
  })

  it('does not offer the button when the browser has no location support', () => {
    render(<CreateEntryForm tripId="trip-1" onCreated={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Use my current location' })).not.toBeInTheDocument()
  })

  it('fills rounded coordinates and keeps the typed location name', async () => {
    const user = userEvent.setup()
    stubGeolocation((onSuccess) => onSuccess({
      coords: { latitude: -33.868812345, longitude: 151.209312345 },
    }))
    render(<CreateEntryForm tripId="trip-1" onCreated={vi.fn()} />)

    await user.type(screen.getByLabelText('Location name (optional)'), 'Circular Quay')
    await user.click(screen.getByRole('button', { name: 'Use my current location' }))

    expect(screen.getByLabelText('Latitude (optional)')).toHaveValue(-33.86881)
    expect(screen.getByLabelText('Longitude (optional)')).toHaveValue(151.20931)
    expect(screen.getByLabelText('Location name (optional)')).toHaveValue('Circular Quay')
    expect(screen.getByText(/current coordinates are filled below/)).toBeInTheDocument()
  })

  it('explains what to do when location access is refused', async () => {
    const user = userEvent.setup()
    stubGeolocation((onSuccess, onError) => onError({ code: 1 }))
    render(<CreateEntryForm tripId="trip-1" onCreated={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Use my current location' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Location access was not allowed')
    expect(screen.getByLabelText('Latitude (optional)')).toHaveValue(null)
    expect(screen.getByRole('button', { name: 'Use my current location' })).toBeEnabled()
  })
})
