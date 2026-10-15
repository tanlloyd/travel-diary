import { useEffect, useMemo, useRef, useState } from 'react'
import './Trips.css'
import CreateTripForm from '../components/CreateTripForm.jsx'
import PageLayout from '../components/PageLayout.jsx'
import TripCard from '../components/TripCard.jsx'
import { getTrips } from '../services/api.js'
import { TRIP_SORT_OPTIONS, filterTrips, sortTrips } from '../utils/trips.js'

function Trips() {
  const createPanel = useRef(null)
  const [trips, setTrips] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const visibleTrips = useMemo(
    () => sortTrips(filterTrips(trips, query), sortBy),
    [trips, query, sortBy],
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadTrips() {
      try {
        const savedTrips = await getTrips(controller.signal)
        if (!controller.signal.aborted) setTrips(savedTrips)
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadTrips()
    return () => controller.abort()
  }, [loadAttempt])

  function retryLoading() {
    setError('')
    setIsLoading(true)
    setLoadAttempt((current) => current + 1)
  }

  function openCreateForm() {
    createPanel.current.open = true
    createPanel.current.querySelector('input').focus()
  }

  function handleCreated(trip) {
    setTrips((current) => [trip, ...current])
    setQuery('')
    setSortBy('newest')
  }

  return (
    <PageLayout>
      <div className="journeys-page">
        <header className="journeys-heading">
          <div>
            <p className="eyebrow">A collection of places & moments</p>
            <h1>My trips</h1>
            <p>Some journeys are still ahead. Others are yours to revisit.</p>
          </div>
          <button type="button" className="journeys-create" onClick={openCreateForm} disabled={isLoading}>
            <span aria-hidden="true">+</span> Create a trip
          </button>
        </header>

        <details className="journeys-create-panel" ref={createPanel}>
          <summary>Start a new journey <span aria-hidden="true">+</span></summary>
          <CreateTripForm onCreated={handleCreated} disabled={isLoading} />
        </details>

        <section className="saved-trips" aria-labelledby="saved-trips-heading" aria-busy={isLoading}>
          <div className="journeys-collection-heading">
            <div>
              <p className="eyebrow">The places you keep</p>
              <h2 id="saved-trips-heading">Your collection</h2>
            </div>
            {!isLoading && !error && <span className="journeys-total">{trips.length} {trips.length === 1 ? 'journey' : 'journeys'}</span>}
          </div>
          {isLoading && <p className="status-panel" role="status">Loading trips…</p>}
          {error && (
            <div className="message-panel message-panel-error">
              <p className="error-message" role="alert">{error}</p>
              <button type="button" onClick={retryLoading}>Try again</button>
            </div>
          )}
          {!isLoading && !error && trips.length === 0 && (
            <div className="empty-state">
              <span aria-hidden="true">✦</span>
              <h3>Your travel diary is ready</h3>
              <p>A weekend away, a long-awaited adventure — give your first journey a home.</p>
              <button type="button" onClick={openCreateForm}>Create your first trip</button>
            </div>
          )}
          {trips.length > 1 && (
            <div className="trip-filters">
              <div>
                <label htmlFor="trip-search">Search trips</label>
                <input
                  id="trip-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, destination, or description"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="trip-sort">Sort by</label>
                <select id="trip-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  {TRIP_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <p className="trip-filter-count" role="status">
                {query.trim()
                  ? `Showing ${visibleTrips.length} of ${trips.length} trips`
                  : `${trips.length} trips`}
              </p>
            </div>
          )}
          {trips.length > 0 && visibleTrips.length === 0 && (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <h3>No trips match your search</h3>
              <p>Try a different name or destination.</p>
              <button type="button" className="secondary-button" onClick={() => setQuery('')}>Clear search</button>
            </div>
          )}
          <div className="trip-grid">
            {visibleTrips.map((trip) => <TripCard key={trip._id} trip={trip} />)}
          </div>
        </section>
      </div>
    </PageLayout>
  )
}

export default Trips
