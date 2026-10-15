import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EntryMap from './EntryMap.jsx'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }) => (
    <div data-testid="map" aria-label={props['aria-label']}>{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: ({ children, center }) => (
    <div data-testid="map-marker" data-position={center.join(',')}>{children}</div>
  ),
  Polyline: ({ positions }) => (
    <div data-testid="map-route" data-points={positions.length} />
  ),
  Popup: ({ children }) => <div>{children}</div>,
  useMap: () => ({
    fitBounds: vi.fn(),
    setView: vi.fn(),
  }),
}))

const mappedEntries = [
  {
    _id: 'entry-1',
    title: 'Arrived in Sydney',
    entryDate: '2026-10-10T00:00:00.000Z',
    locationName: 'Circular Quay',
    latitude: -33.861,
    longitude: 151.2128,
  },
  {
    _id: 'entry-2',
    title: 'Blue Mountains day trip',
    entryDate: '2026-10-11T00:00:00.000Z',
    locationName: 'Echo Point',
    latitude: -33.732,
    longitude: 150.312,
  },
]

describe('EntryMap', () => {
  it('explains how to add a mapped place when no entry has coordinates', () => {
    render(<EntryMap entries={[{
      _id: 'entry-1',
      title: 'Unmapped memory',
      entryDate: '2026-10-10T00:00:00.000Z',
      latitude: null,
      longitude: null,
    }]} />)

    expect(screen.getByRole('heading', { name: 'No mapped places yet' })).toBeInTheDocument()
    expect(screen.getByText(/add both latitude and longitude/i)).toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('shows mapped diary entries as markers, a route, and an accessible place list', () => {
    render(<EntryMap entries={[
      ...mappedEntries,
      {
        _id: 'entry-3',
        title: 'Journal-only memory',
        entryDate: '2026-10-12T00:00:00.000Z',
        latitude: null,
        longitude: null,
      },
    ]} />)

    expect(screen.getByLabelText('Interactive map of diary-entry locations')).toBeInTheDocument()
    expect(screen.getAllByTestId('map-marker')).toHaveLength(2)
    expect(screen.getByTestId('map-route')).toHaveAttribute('data-points', '2')
    expect(screen.getByText('2 places mapped')).toBeInTheDocument()
    expect(screen.getAllByText('Arrived in Sydney')).toHaveLength(2)
    expect(screen.getAllByText('Circular Quay')).toHaveLength(2)
    expect(screen.queryByText('Journal-only memory')).not.toBeInTheDocument()
  })
})
