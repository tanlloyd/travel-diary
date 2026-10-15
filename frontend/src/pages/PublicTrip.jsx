import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EntryCard from '../components/EntryCard.jsx'
import EntryMap from '../components/EntryMap.jsx'
import JourneyReplay from '../components/JourneyReplay.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { getPublicTrip } from '../services/api.js'
import { formatDate } from '../utils/dates.js'

function PublicTrip() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTrip() {
      try {
        const sharedTrip = await getPublicTrip(tripId, controller.signal)
        if (!controller.signal.aborted) {
          setTrip(sharedTrip.trip)
          setEntries(sharedTrip.entries)
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadTrip()
    return () => controller.abort()
  }, [tripId, loadAttempt])

  function retryLoading() {
    setError('')
    setIsLoading(true)
    setLoadAttempt((current) => current + 1)
  }

  return (
    <PageLayout>
      <Link className="back-link" to="/">← Travel Diary home</Link>
      <header className="page-heading">
        <p className="eyebrow">Shared journey</p>
        <h1>{trip?.name || 'Shared trip'}</h1>
        <p>This is a read-only travel diary shared by its owner.</p>
      </header>

      {isLoading && <p className="status-panel" role="status">Loading shared trip…</p>}
      {error && (
        <div className="message-panel message-panel-error">
          <p className="error-message" role="alert">{error}</p>
          <p>The trip may be private, unavailable, or the link may be incorrect.</p>
          <button type="button" onClick={retryLoading}>Try again</button>
        </div>
      )}

      {!isLoading && !error && trip && (
        <>
          <section className="trip-overview" aria-label="Shared trip overview">
            <span className="privacy-badge privacy-badge-public">Public trip</span>
            <p className="trip-destination">{trip.destination}</p>
            <p className="trip-dates">
              <time dateTime={trip.startDate.slice(0, 10)}>{formatDate(trip.startDate)}</time>
              {' – '}
              <time dateTime={trip.endDate.slice(0, 10)}>{formatDate(trip.endDate)}</time>
            </p>
            {trip.description && <p className="trip-description">{trip.description}</p>}
          </section>

          <EntryMap entries={entries} />
          <JourneyReplay entries={entries} />

          <section className="saved-entries" aria-labelledby="shared-entries-heading">
            <h2 id="shared-entries-heading">Diary entries</h2>
            <p>Entries are shown from oldest to newest by entry date.</p>
            {entries.length === 0 && (
              <div className="empty-state">
                <span aria-hidden="true">✎</span>
                <h3>No diary entries yet</h3>
                <p>The owner has not added any memories to this trip.</p>
              </div>
            )}
            <div className="entry-list">
              {entries.map((entry) => (
                <EntryCard key={entry._id} entry={entry} readOnly />
              ))}
            </div>
          </section>
        </>
      )}
    </PageLayout>
  )
}

export default PublicTrip
