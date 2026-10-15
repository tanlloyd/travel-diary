import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import JourneyReplay from './JourneyReplay.jsx'

vi.mock('./EntryMap.jsx', () => ({
  default: ({ activeEntryId, entries }) => (
    <div data-testid="replay-map" data-active-entry={activeEntryId}>
      {entries.map((entry) => entry.title).join(', ')}
    </div>
  ),
}))

const entries = [
  {
    _id: 'entry-2',
    title: 'Mountain lookout',
    content: 'Reached the lookout before sunset.',
    entryDate: '2026-10-12T00:00:00.000Z',
    createdAt: '2026-10-12T09:00:00.000Z',
    photos: [],
  },
  {
    _id: 'entry-1',
    title: 'Harbour arrival',
    content: 'Arrived beside the harbour.',
    entryDate: '2026-10-10T00:00:00.000Z',
    createdAt: '2026-10-10T09:00:00.000Z',
    photos: [],
  },
]

describe('JourneyReplay', () => {
  afterEach(() => vi.useRealTimers())

  it('starts with the earliest entry and provides manual replay controls', () => {
    render(<JourneyReplay entries={entries} />)

    expect(screen.getByText('Memory 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Harbour arrival' })).toBeInTheDocument()
    expect(screen.getByTestId('replay-map')).toHaveAttribute('data-active-entry', 'entry-1')
    expect(screen.getByTestId('replay-map')).toHaveTextContent('Harbour arrival')

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Memory 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mountain lookout' })).toBeInTheDocument()
    expect(screen.getByTestId('replay-map')).toHaveTextContent('Harbour arrival, Mountain lookout')

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(screen.getByText('Memory 1 of 2')).toBeInTheDocument()
  })

  it('advances automatically while the replay is playing', () => {
    vi.useFakeTimers()
    render(<JourneyReplay entries={entries} />)

    fireEvent.click(screen.getByRole('button', { name: 'Play replay' }))
    expect(screen.getByRole('button', { name: 'Pause replay' })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(3500))

    expect(screen.getByText('Memory 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mountain lookout' })).toBeInTheDocument()
  })
})
