import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CreateEntryForm from '../components/CreateEntryForm.jsx'
import EntryMap from '../components/EntryMap.jsx'
import DiaryTimeline from '../components/DiaryTimeline.jsx'
import EditTripForm from '../components/EditTripForm.jsx'
import JourneyReplay from '../components/JourneyReplay.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { deleteTrip, getEntries, getTrip, regenerateShareLink } from '../services/api.js'
import { formatDate } from '../utils/dates.js'
import { buildTripExport, downloadJson, exportFileName } from '../utils/exportTrip.js'

import './TripDetails.css'

function sortEntries(entries) {
  return [...entries].sort((a, b) => (
    a.entryDate.localeCompare(b.entryDate) ||
    a.createdAt.localeCompare(b.createdAt) ||
    a._id.localeCompare(b._id)
  ))
}

function TripDetailsContent({ tripId }) {
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isEditingTrip, setIsEditingTrip] = useState(false)
  const [isDeletingTrip, setIsDeletingTrip] = useState(false)
  const [tripActionError, setTripActionError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [isReplacingLink, setIsReplacingLink] = useState(false)
  const shareUrl = `${window.location.origin}/shared/trips/${trip?.shareToken || tripId}`

  useEffect(() => {
    const controller = new AbortController()

    async function loadTrip() {
      try {
        const [savedTrip, savedEntries] = await Promise.all([
          getTrip(tripId, controller.signal),
          getEntries(tripId, controller.signal),
        ])
        if (!controller.signal.aborted) {
          setTrip(savedTrip)
          setEntries(savedEntries)
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

  function handleCreated(entry) {
    setEntries((current) => sortEntries([...current, entry]))
  }

  function handleUpdated(updatedEntry) {
    setEntries((current) => sortEntries(current.map((entry) => (
      entry._id === updatedEntry._id ? updatedEntry : entry
    ))))
  }

  function handleDeleted(entryId) {
    setEntries((current) => current.filter((entry) => entry._id !== entryId))
  }

  function handleTripUpdated(updatedTrip) {
    setTrip(updatedTrip)
    setIsEditingTrip(false)
    setTripActionError('')
  }

  async function handleTripDelete() {
    if (
      isDeletingTrip ||
      !window.confirm(`Delete “${trip.name}” and all of its diary entries? This cannot be undone.`)
    ) return

    setTripActionError('')
    setIsDeletingTrip(true)

    try {
      await deleteTrip(tripId)
      navigate('/trips', { replace: true })
    } catch (error) {
      setTripActionError(error.message)
      setIsDeletingTrip(false)
    }
  }

  async function replaceShareLink() {
    if (
      isReplacingLink ||
      !window.confirm('Create a new sharing link? The current link will stop working for everyone who has it.')
    ) return

    setTripActionError('')
    setCopyStatus('')
    setIsReplacingLink(true)

    try {
      setTrip(await regenerateShareLink(tripId))
      setCopyStatus('New sharing link created. The previous link no longer works.')
    } catch (error) {
      setTripActionError(error.message)
    } finally {
      setIsReplacingLink(false)
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyStatus('Sharing link copied.')
    } catch {
      setCopyStatus('Copy the sharing link from the field.')
    }
  }

  return (
    <PageLayout>
      <div className="trip-details-page">
        <Link className="back-link" to="/trips">← Back to my trips</Link>
        {(isLoading || error || !trip) && <h1 className="trip-title">Trip details</h1>}
        {isLoading && <p className="status-panel" role="status">Loading trip and entries…</p>}
        {error && (
          <div className="message-panel message-panel-error">
            <p className="error-message" role="alert">{error}</p>
            <button type="button" onClick={retryLoading}>Try again</button>
          </div>
        )}
        {!isLoading && !error && trip && (
          <>
            <header className="trip-details-header">
              <div className="trip-details-intro">
                <p className="eyebrow">Your travel journal</p>
                <h1 className="trip-title">{trip.name}</h1>
                {trip.description && <p className="trip-description">{trip.description}</p>}
              </div>
              <section className="trip-details-facts" aria-label="Trip overview">
                <span className={`privacy-badge ${trip.isPublic ? 'privacy-badge-public' : ''}`}>
                  {trip.isPublic ? 'Public trip' : 'Private trip'}
                </span>
                <dl>
                  <div>
                    <dt>Destination</dt>
                    <dd>{trip.destination}</dd>
                  </div>
                  <div>
                    <dt>Travel dates</dt>
                    <dd>
                      <time dateTime={trip.startDate.slice(0, 10)}>{formatDate(trip.startDate)}</time>
                      {' – '}
                      <time dateTime={trip.endDate.slice(0, 10)}>{formatDate(trip.endDate)}</time>
                    </dd>
                  </div>
                </dl>
              </section>
            </header>
            {isEditingTrip ? (
              <EditTripForm
                trip={trip}
                onUpdated={handleTripUpdated}
                onCancel={() => setIsEditingTrip(false)}
              />
            ) : (
              <div className="trip-details-actions" aria-label="Trip actions" role="group">
                <div className="trip-actions">
                  <a className="trip-write-link" href="#entry-title">Write a memory <span aria-hidden="true">↗</span></a>
                  <button type="button" className="secondary-button" onClick={() => { setTripActionError(''); setIsEditingTrip(true) }}>
                    Edit trip
                  </button>
                </div>
                <div className="trip-actions trip-details-tools" role="group" aria-label="Export and manage trip">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => downloadJson(exportFileName(trip), buildTripExport(trip, entries))}
                  >
                    Download as JSON
                  </button>
                  <button type="button" className="secondary-button" onClick={() => window.print()}>
                    Print or save as PDF
                  </button>
                  <button type="button" className="danger-button" onClick={handleTripDelete} disabled={isDeletingTrip}>
                    {isDeletingTrip ? 'Deleting…' : 'Delete trip'}
                  </button>
                </div>
              </div>
            )}
            {tripActionError && <p className="error-message" role="alert">{tripActionError}</p>}
            <nav className="trip-section-nav" aria-label="Trip sections">
              <a href="#trip-places">Places</a>
              <a href="#trip-diary">Diary entries <span>{entries.length}</span></a>
              {entries.length > 0 && <a href="#trip-replay">Replay</a>}
              {trip.isPublic && !isEditingTrip && <a href="#trip-sharing">Sharing</a>}
            </nav>
            {trip.isPublic && !isEditingTrip && (
              <section id="trip-sharing" className="share-panel" aria-labelledby="share-trip-heading">
                <div>
                  <h2 id="share-trip-heading">Share this trip</h2>
                  <p>Anyone with this link can view the trip and its diary entries without signing in.</p>
                </div>
                <label htmlFor="trip-share-link">Public sharing link</label>
                <div className="share-link-row">
                  <input
                    id="trip-share-link"
                    readOnly
                    value={shareUrl}
                    onFocus={(event) => event.target.select()}
                  />
                  <button type="button" onClick={copyShareLink}>Copy link</button>
                  <button type="button" className="secondary-button" onClick={replaceShareLink} disabled={isReplacingLink}>
                    {isReplacingLink ? 'Creating…' : 'Create new link'}
                  </button>
                </div>
                <p className="share-link-help">
                  Create a new link to stop the current one from working without making the trip private.
                </p>
                {copyStatus && <p className="success-message" role="status">{copyStatus}</p>}
              </section>
            )}
            <div id="trip-places" className="trip-details-section" tabIndex={-1}>
              <EntryMap entries={entries} />
            </div>
            <div className="trip-details-writing">
              <div className="trip-details-writing-intro">
                <p className="eyebrow">Keep the little things</p>
                <h2>A place for every memory.</h2>
                <p>The places you found, the people you met, the moments you want to remember.</p>
              </div>
              <CreateEntryForm tripId={tripId} trip={trip} onCreated={handleCreated} />
            </div>

            <section id="trip-diary" tabIndex={-1} className="saved-entries trip-details-section" aria-labelledby="entries-heading">
              <p className="eyebrow">The stories along the way</p>
              <h2 id="entries-heading">Diary entries</h2>
              <p>Memories are grouped by date, from oldest to newest. Day 01 is the first day of your trip; only dates with entries are shown.</p>
              {entries.length === 0 && (
                <div className="empty-state">
                  <span aria-hidden="true">✎</span>
                  <h3>No diary entries yet</h3>
                  <p>Add your first memory using the form above.</p>
                </div>
              )}
              <DiaryTimeline
                entries={entries}
                tripId={tripId}
                trip={trip}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            </section>
            {entries.length > 0 && (
              <div id="trip-replay" className="trip-details-section" tabIndex={-1}>
                <JourneyReplay entries={entries} />
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  )
}

function TripDetails() {
  const { tripId } = useParams()
  // Reset the form and loaded data when navigating to a different trip.
  return <TripDetailsContent key={tripId} tripId={tripId} />
}

export default TripDetails
