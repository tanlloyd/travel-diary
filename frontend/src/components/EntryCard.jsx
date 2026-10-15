import { useState } from 'react'
import { deleteEntry, refreshEntryWeather } from '../services/api.js'
import { formatDate } from '../utils/dates.js'
import EditEntryForm from './EditEntryForm.jsx'
import WeatherChip from './WeatherChip.jsx'

function EntryCard({ tripId, trip, entry, onUpdated, onDeleted, readOnly = false }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshingWeather, setIsRefreshingWeather] = useState(false)
  const [error, setError] = useState('')
  const date = formatDate(entry.entryDate)

  function handleUpdated(updatedEntry) {
    onUpdated(updatedEntry)
    setIsEditing(false)
  }

  async function handleDelete() {
    if (isDeleting || !window.confirm(`Delete “${entry.title}”? This cannot be undone.`)) return

    setError('')
    setIsDeleting(true)

    try {
      await deleteEntry(tripId, entry._id)
      onDeleted(entry._id)
    } catch (error) {
      setError(error.message)
      setIsDeleting(false)
    }
  }

  async function handleWeatherRefresh() {
    if (isRefreshingWeather) return

    setError('')
    setIsRefreshingWeather(true)

    try {
      const updatedEntry = await refreshEntryWeather(tripId, entry._id)
      onUpdated(updatedEntry)
    } catch (error) {
      setError(error.message)
    } finally {
      setIsRefreshingWeather(false)
    }
  }

  return (
    <article className="entry-card">
      {isEditing ? (
        <EditEntryForm
          tripId={tripId}
          trip={trip}
          entry={entry}
          onUpdated={handleUpdated}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <h3>{entry.title}</h3>
          <p className="entry-meta"><time dateTime={entry.entryDate.slice(0, 10)}>{date}</time></p>
          {entry.locationName && <p className="entry-meta"><strong>Location:</strong> {entry.locationName}</p>}
          {entry.latitude != null && entry.longitude != null && (
            <p className="entry-meta"><strong>Coordinates:</strong> {entry.latitude}, {entry.longitude}</p>
          )}
          {entry.weather && (
            <WeatherChip weather={entry.weather} date={date} />
          )}
          {entry.photos?.length > 0 && (
            <section className="entry-photos" aria-label={`Photos from ${entry.title}`}>
              {entry.photos.map((photo, index) => (
                <figure key={`${photo.dataUrl.slice(-24)}-${index}`}>
                  <img
                    src={photo.dataUrl}
                    alt={photo.alt || `Photo ${index + 1} from ${entry.title}`}
                    loading="lazy"
                  />
                  {photo.alt && <figcaption>{photo.alt}</figcaption>}
                </figure>
              ))}
            </section>
          )}
          <p className="entry-content">{entry.content}</p>
          {!readOnly && (
            <div className="entry-actions">
              {entry.latitude != null && entry.longitude != null && (
                <button type="button" className="secondary-button" onClick={handleWeatherRefresh} disabled={isRefreshingWeather}>
                  {isRefreshingWeather ? 'Checking weather…' : entry.weather ? 'Refresh weather' : 'Get weather'}
                </button>
              )}
              <button type="button" onClick={() => { setError(''); setIsEditing(true) }}>Edit</button>
              <button type="button" className="danger-button" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </>
      )}
      {error && <p className="error-message" role="alert">{error}</p>}
    </article>
  )
}

export default EntryCard
