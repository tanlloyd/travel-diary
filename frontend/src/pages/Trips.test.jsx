import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTrip, getTrips } from '../services/api.js'
import Trips from './Trips.jsx'

vi.mock('../services/api.js', () => ({ createTrip: vi.fn(), getTrips: vi.fn() }))
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ user: { name: 'Aisha Traveller' }, logout: vi.fn() }),
}))

function trip(overrides) {
  return {
    description: '',
    isPublic: false,
    endDate: '2026-12-31T00:00:00.000Z',
    ...overrides,
  }
}

const savedTrips = [
  trip({ _id: '1', name: 'Kyoto temples', destination: 'Japan', startDate: '2026-11-02T00:00:00.000Z', createdAt: '2026-09-03T00:00:00.000Z' }),
  trip({ _id: '2', name: 'Alpine hiking', destination: 'New Zealand', startDate: '2026-02-10T00:00:00.000Z', createdAt: '2026-09-02T00:00:00.000Z' }),
  trip({ _id: '3', name: 'Harbour weekend', destination: 'Sydney', startDate: '2026-06-20T00:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z' }),
]

function renderTrips() {
  return render(<MemoryRouter><Trips /></MemoryRouter>)
}

function shownTripNames() {
  const list = screen.getByRole('region', { name: 'Your collection' })
  return within(list).getAllByRole('article').map((card) => within(card).getByRole('heading').textContent)
}

describe('Trips page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('searches and sorts the saved trips', async () => {
    getTrips.mockResolvedValue(savedTrips)
    const user = userEvent.setup()
    renderTrips()

    expect(await screen.findByText('3 trips')).toBeInTheDocument()
    expect(shownTripNames()).toEqual(['Kyoto temples', 'Alpine hiking', 'Harbour weekend'])

    await user.selectOptions(screen.getByLabelText('Sort by'), 'Start date: earliest first')
    expect(shownTripNames()).toEqual(['Alpine hiking', 'Harbour weekend', 'Kyoto temples'])

    await user.type(screen.getByLabelText('Search trips'), 'sydney')
    expect(shownTripNames()).toEqual(['Harbour weekend'])
    expect(screen.getByText('Showing 1 of 3 trips')).toBeInTheDocument()
  })

  it('offers to clear a search that matches nothing', async () => {
    getTrips.mockResolvedValue(savedTrips)
    const user = userEvent.setup()
    renderTrips()

    await user.type(await screen.findByLabelText('Search trips'), 'paris')
    expect(screen.getByRole('heading', { name: 'No trips match your search' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(shownTripNames()).toHaveLength(3)
  })

  it('keeps the controls out of the way until there is more than one trip', async () => {
    getTrips.mockResolvedValue([savedTrips[0]])
    renderTrips()

    expect(await screen.findByRole('heading', { name: 'Kyoto temples' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Search trips')).not.toBeInTheDocument()
  })

  it('opens the create form, focuses the name and reveals a new trip after a filtered search', async () => {
    getTrips.mockResolvedValue(savedTrips)
    createTrip.mockResolvedValue(trip({ _id: '4', name: 'Coastal escape', destination: 'Wollongong', startDate: '2026-12-01', endDate: '2026-12-01', createdAt: '2026-10-01' }))
    const user = userEvent.setup()
    renderTrips()
    await user.type(await screen.findByLabelText('Search trips'), 'Japan')
    await user.selectOptions(screen.getByLabelText('Sort by'), 'name')
    const details = screen.getByText('Start a new journey').closest('details')
    expect(details).not.toHaveAttribute('open')
    await user.click(screen.getByRole('button', { name: 'Create a trip', exact: true }))
    expect(details).toHaveAttribute('open')
    expect(screen.getByLabelText('Trip name')).toHaveFocus()
    await user.type(screen.getByLabelText('Trip name'), 'Coastal escape')
    await user.type(screen.getByLabelText('Destination'), 'Wollongong')
    await user.type(screen.getByLabelText('Start date'), '2026-12-01')
    await user.type(screen.getByLabelText('End date'), '2026-12-01')
    await user.click(screen.getByRole('button', { name: 'Save trip' }))
    expect(await screen.findByText('Trip saved.')).toBeInTheDocument()
    expect(screen.getByLabelText('Search trips')).toHaveValue('')
    expect(screen.getByLabelText('Sort by')).toHaveValue('newest')
    expect(shownTripNames()[0]).toBe('Coastal escape')
    expect(screen.getByText('1 day')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View trip: Coastal escape' })).toHaveAttribute('href', '/trips/4')
  })

  it('opens the first-trip form from the empty collection', async () => {
    getTrips.mockResolvedValue([])
    renderTrips()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Create your first trip' }))
    expect(screen.getByLabelText('Trip name')).toHaveFocus()
  })

})
