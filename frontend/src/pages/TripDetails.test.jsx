import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createEntry,
  deleteEntry,
  deleteTrip,
  getEntries,
  getTrip,
  regenerateShareLink,
  updateEntry,
  updateTrip,
} from '../services/api.js'
import TripDetails from './TripDetails.jsx'

vi.mock('../services/api.js', () => ({
  createEntry: vi.fn(),
  deleteEntry: vi.fn(),
  deleteTrip: vi.fn(),
  getEntries: vi.fn(),
  getTrip: vi.fn(),
  refreshEntryWeather: vi.fn(),
  regenerateShareLink: vi.fn(),
  updateEntry: vi.fn(),
  updateTrip: vi.fn(),
}))
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ user: { name: 'Aisha Traveller' }, logout: vi.fn() }),
}))
// The map and replay have their own tests; leaving them out keeps one copy of each entry on the page.
vi.mock('../components/EntryMap.jsx', () => ({ default: () => null }))
vi.mock('../components/JourneyReplay.jsx', () => ({ default: () => null }))

const trip = {
  _id: 'trip-1',
  name: 'Japan autumn journey',
  destination: 'Japan',
  startDate: '2026-10-05T00:00:00.000Z',
  endDate: '2026-10-12T00:00:00.000Z',
  description: 'Temples and trains.',
  isPublic: false,
}

const entry = {
  _id: 'entry-1',
  title: 'Tokyo arrival',
  content: 'Explored the city after checking in.',
  entryDate: '2026-10-06T00:00:00.000Z',
  createdAt: '2026-10-06T09:00:00.000Z',
  locationName: 'Tokyo',
  latitude: null,
  longitude: null,
  photos: [],
}

function renderTripDetails() {
  return render(
    <MemoryRouter initialEntries={['/trips/trip-1']}>
      <Routes>
        <Route path="/trips/:tripId" element={<TripDetails />} />
        <Route path="/trips" element={<h1>Trip list</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TripDetails owner actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    getTrip.mockResolvedValue(trip)
    getEntries.mockResolvedValue([entry])
  })

  it('renames a trip without leaving the page', async () => {
    updateTrip.mockResolvedValue({ ...trip, name: 'Japan in autumn' })
    const user = userEvent.setup()
    renderTripDetails()

    await user.click(await screen.findByRole('button', { name: 'Edit trip' }))
    await user.clear(screen.getByLabelText('Trip name'))
    await user.type(screen.getByLabelText('Trip name'), 'Japan in autumn')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Japan in autumn' })).toBeInTheDocument()
    expect(updateTrip).toHaveBeenCalledWith('trip-1', expect.objectContaining({
      name: 'Japan in autumn',
      destination: 'Japan',
      startDate: '2026-10-05',
      endDate: '2026-10-12',
    }))
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('deletes a trip after confirmation and returns to the trip list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    deleteTrip.mockResolvedValue({ message: 'Trip deleted.' })
    const user = userEvent.setup()
    renderTripDetails()

    await user.click(await screen.findByRole('button', { name: 'Delete trip' }))

    expect(deleteTrip).toHaveBeenCalledWith('trip-1')
    expect(await screen.findByRole('heading', { name: 'Trip list' })).toBeInTheDocument()
  })

  it('keeps the trip when deletion is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderTripDetails()

    await user.click(await screen.findByRole('button', { name: 'Delete trip' }))

    expect(deleteTrip).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { level: 1, name: 'Japan autumn journey' })).toBeInTheDocument()
  })

  it('shows the reason when a trip cannot be deleted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    deleteTrip.mockRejectedValue(new Error('Unable to reach the server. Please try again.'))
    const user = userEvent.setup()
    renderTripDetails()

    await user.click(await screen.findByRole('button', { name: 'Delete trip' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server.')
    expect(screen.getByRole('button', { name: 'Delete trip' })).toBeEnabled()
  })

  it('updates a diary entry in place', async () => {
    updateEntry.mockResolvedValue({ ...entry, title: 'First night in Tokyo' })
    const user = userEvent.setup()
    renderTripDetails()

    const card = await screen.findByRole('article')
    await user.click(within(card).getByRole('button', { name: 'Edit' }))
    await user.clear(within(card).getByLabelText('Title'))
    await user.type(within(card).getByLabelText('Title'), 'First night in Tokyo')
    await user.click(within(card).getByRole('button', { name: 'Save changes' }))

    expect(await within(card).findByRole('heading', { name: 'First night in Tokyo' })).toBeInTheDocument()
    expect(updateEntry).toHaveBeenCalledWith('trip-1', 'entry-1', expect.objectContaining({
      title: 'First night in Tokyo',
      entryDate: '2026-10-06',
    }))
  })

  it('removes a deleted diary entry from the page', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    deleteEntry.mockResolvedValue(entry)
    const user = userEvent.setup()
    renderTripDetails()

    const card = await screen.findByRole('article')
    await user.click(within(card).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('heading', { name: 'No diary entries yet' })).toBeInTheDocument()
    expect(deleteEntry).toHaveBeenCalledWith('trip-1', 'entry-1')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('shows the sharing link only for a public trip and can replace it', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    getTrip.mockResolvedValue({ ...trip, isPublic: true, shareToken: 'a'.repeat(32) })
    regenerateShareLink.mockResolvedValue({ ...trip, isPublic: true, shareToken: 'b'.repeat(32) })
    const user = userEvent.setup()
    renderTripDetails()

    const link = await screen.findByLabelText('Public sharing link')
    expect(link.value).toMatch(new RegExp(`/shared/trips/${'a'.repeat(32)}$`))

    await user.click(screen.getByRole('button', { name: 'Create new link' }))

    expect(await screen.findByText(/previous link no longer works/)).toBeInTheDocument()
    expect(link.value).toMatch(new RegExp(`/shared/trips/${'b'.repeat(32)}$`))
  })

  it('does not offer a sharing link for a private trip', async () => {
    renderTripDetails()

    expect(await screen.findByText('Private trip')).toBeInTheDocument()
    expect(screen.queryByLabelText('Public sharing link')).not.toBeInTheDocument()
  })

  it('groups unsorted entries by date and keeps gaps in trip day numbers', async () => {
    getEntries.mockResolvedValue([
      { ...entry, _id: 'late', title: 'Later memory', entryDate: '2026-10-08' },
      { ...entry, _id: 'second', title: 'Second memory', entryDate: '2026-10-05', createdAt: '2026-10-05T12:00:00Z' },
      { ...entry, _id: 'first', title: 'First memory', entryDate: '2026-10-05T00:00:00.000Z', createdAt: '2026-10-05T08:00:00Z' },
    ])
    renderTripDetails()

    const timeline = await screen.findByRole('list', { name: 'Diary timeline' })
    const days = within(timeline).getAllByRole('listitem')
    expect(days).toHaveLength(2)
    expect(days[0]).toHaveAccessibleName(/^Day 01/)
    expect(days[1]).toHaveAccessibleName(/^Day 04/)
    expect(within(days[0]).getByText('2 memories')).toBeInTheDocument()
    expect(within(days[0]).getAllByRole('heading').map((heading) => heading.textContent))
      .toEqual(['First memory', 'Second memory'])
    expect(within(days[1]).getByText('1 memory')).toBeInTheDocument()
  })

  it('retains entries outside the trip without assigning negative or extra trip days', async () => {
    getEntries.mockResolvedValue(['2026-10-04', '2026-10-05', '2026-10-12', '2026-10-13'].map((date) => ({
      ...entry, _id: date, entryDate: date,
    })))
    renderTripDetails()

    const timeline = await screen.findByRole('list', { name: 'Diary timeline' })
    const days = within(timeline).getAllByRole('listitem')
    expect(days.map((day) => within(day).getByText(/^(Day |Before the trip|After the trip)/).textContent))
      .toEqual(['Before the trip', 'Day 01', 'Day 08', 'After the trip'])
    expect(within(timeline).getAllByRole('article')).toHaveLength(4)
  })

  it.each([
    ['2028-02-28', '2028-03-01', 'Day 03'],
    ['2026-10-03', '2026-10-05', 'Day 03'],
    ['2026-12-31', '2027-01-01', 'Day 02'],
  ])('counts calendar days from %s to %s', async (startDate, entryDate, label) => {
    getTrip.mockResolvedValue({ ...trip, startDate, endDate: entryDate })
    getEntries.mockResolvedValue([{ ...entry, entryDate }])
    renderTripDetails()
    expect(await screen.findByText(label, { exact: true })).toBeInTheDocument()
  })

  it('moves a dated entry into its new group after editing', async () => {
    updateEntry.mockResolvedValue({ ...entry, entryDate: '2026-10-08' })
    const user = userEvent.setup()
    renderTripDetails()
    const card = await screen.findByRole('article')
    await user.click(within(card).getByRole('button', { name: 'Edit' }))
    await user.clear(within(card).getByLabelText('Entry date'))
    await user.type(within(card).getByLabelText('Entry date'), '2026-10-08')
    await user.click(within(card).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Day 04', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('Day 02', { exact: true })).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(updateEntry).toHaveBeenCalledWith('trip-1', 'entry-1', expect.objectContaining({ entryDate: '2026-10-08' }))
  })

  it('recalculates day numbers when the trip start date changes', async () => {
    updateTrip.mockResolvedValue({ ...trip, startDate: '2026-10-04' })
    const user = userEvent.setup()
    renderTripDetails()
    await user.click(await screen.findByRole('button', { name: 'Edit trip' }))
    await user.clear(screen.getByLabelText('Start date'))
    await user.type(screen.getByLabelText('Start date'), '2026-10-04')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Day 03', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('Day 02', { exact: true })).not.toBeInTheDocument()
  })

  it('adds a memory to an existing day and removes the group when its last entry is deleted', async () => {
    createEntry.mockResolvedValue({ ...entry, _id: 'entry-2', title: 'Evening walk' })
    deleteEntry.mockResolvedValue({})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderTripDetails()
    await screen.findByRole('list', { name: 'Diary timeline' })
    await user.type(screen.getByLabelText('Title'), 'Evening walk')
    await user.type(screen.getByLabelText('Content'), 'Along the river.')
    await user.type(screen.getByLabelText('Entry date'), '2026-10-06')
    await user.click(screen.getByRole('button', { name: 'Save entry' }))

    expect(await screen.findByText('2 memories')).toBeInTheDocument()
    const timeline = screen.getByRole('list', { name: 'Diary timeline' })
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(1)
    for (const card of within(timeline).getAllByRole('article')) {
      await user.click(within(card).getByRole('button', { name: 'Delete', exact: true }))
    }
    expect(await screen.findByRole('heading', { name: 'No diary entries yet' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Diary timeline' })).not.toBeInTheDocument()
  })

})
