import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CreateEntryForm from './CreateEntryForm.jsx'

vi.mock('../services/api.js', () => ({ createEntry: vi.fn() }))

const trip = {
  _id: 'trip-1',
  startDate: '2026-10-05T00:00:00.000Z',
  endDate: '2026-10-12T00:00:00.000Z',
}

describe('CreateEntryForm', () => {
  it('points out an entry date outside the trip without blocking it', () => {
    render(<CreateEntryForm tripId="trip-1" trip={trip} onCreated={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Entry date'), { target: { value: '2026-10-08' } })
    expect(screen.queryByText(/outside the trip/)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Entry date'), { target: { value: '2026-10-20' } })
    expect(screen.getByText(/outside the trip/)).toHaveTextContent('You can still save the entry.')
    expect(screen.getByRole('button', { name: 'Save entry' })).toBeEnabled()
  })
})
