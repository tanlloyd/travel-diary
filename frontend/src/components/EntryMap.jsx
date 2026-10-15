import { useEffect, useId, useMemo } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const WORLD_CENTER = [20, 0]
const ROUTE_COLOUR = '#176b68'
const MARKER_COLOUR = '#b7472b'

function entriesWithCoordinates(entries) {
  return entries.filter((entry) => (
    Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude)
  ))
}

function formatEntryDate(value) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function FitMapToEntries({ positions, activePosition }) {
  const map = useMap()

  useEffect(() => {
    if (activePosition) {
      map.setView(activePosition, 11)
      return
    }

    if (positions.length === 1) {
      map.setView(positions[0], 11)
      return
    }

    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40], maxZoom: 12 })
    }
  }, [activePosition, map, positions])

  return null
}

function EntryMap({
  entries,
  activeEntryId = null,
  eyebrow = 'Journey map',
  heading = 'Places from this trip',
  showPlaceList = true,
}) {
  const headingId = useId()
  const mappedEntries = useMemo(() => entriesWithCoordinates(entries), [entries])
  const positions = useMemo(() => mappedEntries.map((entry) => (
    [entry.latitude, entry.longitude]
  )), [mappedEntries])
  const activePosition = useMemo(() => {
    const activeEntry = mappedEntries.find((entry) => entry._id === activeEntryId)
    return activeEntry ? [activeEntry.latitude, activeEntry.longitude] : null
  }, [activeEntryId, mappedEntries])

  return (
    <section className="entry-map-section" aria-labelledby={headingId}>
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={headingId}>{heading}</h2>
        </div>
        {mappedEntries.length > 0 && (
          <p className="map-count">
            {mappedEntries.length} {mappedEntries.length === 1 ? 'place' : 'places'} mapped
          </p>
        )}
      </div>

      {mappedEntries.length === 0 ? (
        <div className="empty-state map-empty-state">
          <span aria-hidden="true">⌖</span>
          <h3>No mapped places yet</h3>
          <p>Add both latitude and longitude to a diary entry to show it here.</p>
        </div>
      ) : (
        <>
          <MapContainer
            center={WORLD_CENTER}
            zoom={2}
            scrollWheelZoom={false}
            className="entry-map"
            aria-label="Interactive map of diary-entry locations"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitMapToEntries positions={positions} activePosition={activePosition} />
            {positions.length > 1 && (
              <Polyline
                positions={positions}
                pathOptions={{ color: ROUTE_COLOUR, weight: 3, opacity: 0.75 }}
              />
            )}
            {mappedEntries.map((entry) => (
              <CircleMarker
                key={entry._id}
                center={[entry.latitude, entry.longitude]}
                radius={9}
                pathOptions={{
                  color: '#fffdf8',
                  fillColor: entry._id === activeEntryId ? ROUTE_COLOUR : MARKER_COLOUR,
                  fillOpacity: 1,
                  weight: entry._id === activeEntryId ? 5 : 3,
                }}
              >
                <Popup>
                  <strong>{entry.title}</strong>
                  <span className="map-popup-date">{formatEntryDate(entry.entryDate)}</span>
                  {entry.locationName && <span>{entry.locationName}</span>}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {showPlaceList && <ol className="mapped-place-list" aria-label="Mapped diary entries">
            {mappedEntries.map((entry) => (
              <li key={entry._id}>
                <span className="map-place-number" aria-hidden="true" />
                <span>
                  <strong>{entry.title}</strong>
                  <span>{entry.locationName || 'Saved coordinates'}</span>
                </span>
                <time dateTime={entry.entryDate.slice(0, 10)}>
                  {formatEntryDate(entry.entryDate)}
                </time>
              </li>
            ))}
          </ol>}
        </>
      )}
    </section>
  )
}

export default EntryMap
