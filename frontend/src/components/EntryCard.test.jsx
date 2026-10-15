import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshEntryWeather } from '../services/api.js'
import EntryCard from './EntryCard.jsx'

vi.mock('../services/api.js', () => ({
  deleteEntry: vi.fn(),
  refreshEntryWeather: vi.fn(),
  updateEntry: vi.fn(),
}))

const entry = {
  _id: 'entry-1',
  title: 'Harbour walk',
  content: 'Walked around Circular Quay.',
  entryDate: '2026-10-04T00:00:00.000Z',
  locationName: 'Sydney',
  latitude: -33.8688,
  longitude: 151.2093,
  weather: {
    condition: 'Partly cloudy',
    temperatureMax: 24.5,
    temperatureMin: 14.2,
    precipitation: 0.8,
    source: 'Open-Meteo',
  },
  photos: [{
    dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    alt: 'Sydney harbour',
  }],
}

describe('EntryCard weather', () => {
  beforeEach(() => vi.clearAllMocks())

  it('displays saved weather with the diary entry', () => {
    render(<EntryCard tripId="trip-1" entry={entry} onUpdated={vi.fn()} onDeleted={vi.fn()} />)

    expect(screen.getByRole('region', { name: /weather on/i })).toHaveTextContent('Partly cloudy')
    expect(screen.getByText(/24.5°C/)).toBeInTheDocument()
    expect(screen.getByText('0.8 mm precipitation')).toBeInTheDocument()
    expect(screen.getByText('Weather saved from Open-Meteo')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sydney harbour' })).toHaveAttribute(
      'src',
      entry.photos[0].dataUrl,
    )
  })

  it('lets the user retrieve weather again without editing the entry', async () => {
    const updatedEntry = { ...entry, weather: { ...entry.weather, condition: 'Clear sky' } }
    refreshEntryWeather.mockResolvedValue(updatedEntry)
    const onUpdated = vi.fn()
    const user = userEvent.setup()

    render(<EntryCard tripId="trip-1" entry={entry} onUpdated={onUpdated} onDeleted={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Refresh weather' }))

    expect(refreshEntryWeather).toHaveBeenCalledWith('trip-1', 'entry-1')
    expect(onUpdated).toHaveBeenCalledWith(updatedEntry)
  })

  it('hides every owner action on a read-only shared entry', () => {
    render(<EntryCard entry={entry} readOnly />)

    expect(screen.getByRole('heading', { name: 'Harbour walk' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refresh weather' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('offers Get weather when no saved weather exists and coordinates are available', () => {
    render(<EntryCard tripId="trip-1" entry={{ ...entry, weather: null }} onUpdated={vi.fn()} onDeleted={vi.fn()} />)
    expect(screen.queryByRole('region', { name: /weather on/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get weather' })).toBeEnabled()
  })

  it('does not offer retrieval without coordinates', () => {
    render(<EntryCard tripId="trip-1" entry={{ ...entry, weather: null, latitude: null, longitude: null }} onUpdated={vi.fn()} onDeleted={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Get weather' })).not.toBeInTheDocument()
  })

  it('keeps saved weather visible during refresh and after a failed request', async () => {
    let rejectRefresh
    refreshEntryWeather.mockReturnValue(new Promise((resolve, reject) => { rejectRefresh = reject }))
    const user = userEvent.setup()
    const onUpdated = vi.fn()
    render(<EntryCard tripId="trip-1" entry={entry} onUpdated={onUpdated} onDeleted={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Refresh weather' }))
    expect(screen.getByRole('button', { name: 'Checking weather…' })).toBeDisabled()
    expect(screen.getByRole('region', { name: /weather on/i })).toHaveTextContent('Partly cloudy')
    await act(async () => rejectRefresh(new Error('Weather is temporarily unavailable. Please try again.')))
    expect(await screen.findByRole('alert')).toHaveTextContent('Weather is temporarily unavailable.')
    expect(screen.getByRole('button', { name: 'Refresh weather' })).toBeEnabled()
    expect(screen.getByText('Weather saved from Open-Meteo')).toBeInTheDocument()
    expect(onUpdated).not.toHaveBeenCalled()
  })

  it('preserves zero and negative readings and unknown conditions in read-only entries', () => {
    render(<EntryCard entry={{ ...entry, weather: { ...entry.weather, code: 999, condition: 'Unknown conditions', temperatureMax: 0, temperatureMin: -8, precipitation: 0 } }} readOnly />)
    expect(screen.getByText('0°C')).toBeInTheDocument()
    expect(screen.getByText('-8°C')).toBeInTheDocument()
    expect(screen.getByText('0 mm precipitation')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /weather on/i })).toHaveTextContent('Unknown conditions')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

})
