import { useState } from 'react'
import { createEntry } from '../services/api.js'
import { formatDate, isOutsideTrip } from '../utils/dates.js'
import EntryPhotoInput from './EntryPhotoInput.jsx'
import PlaceSearch from './PlaceSearch.jsx'

const emptyForm = {
  title: '',
  content: '',
  entryDate: '',
  locationName: '',
  latitude: '',
  longitude: '',
  photos: [],
}

function CreateEntryForm({ tripId, trip, onCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchKey, setSearchKey] = useState(0)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSaving) return

    setError('')
    setSuccess('')

    if (!form.title.trim() || !form.content.trim() || !form.entryDate) {
      setError('Enter a title, content, and entry date.')
      return
    }

    const latitude = form.latitude.trim() === '' ? null : Number(form.latitude)
    const longitude = form.longitude.trim() === '' ? null : Number(form.longitude)

    if ((latitude === null) !== (longitude === null)) {
      setError('Provide both latitude and longitude, or leave both blank.')
      return
    }

    if (latitude !== null && (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    )) {
      setError('Latitude must be between -90 and 90, and longitude between -180 and 180.')
      return
    }

    setIsSaving(true)

    try {
      const entry = await createEntry(tripId, { ...form, latitude, longitude })
      onCreated(entry)
      setForm(emptyForm)
      setSearchKey((current) => current + 1)
      setSuccess('Entry saved.')
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="entry-form-panel" aria-labelledby="create-entry-heading">
      <h2 id="create-entry-heading">Create a diary entry</h2>
      <p>Title, content, and entry date are required. Coordinates add the entry to the map and retrieve local weather.</p>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSaving}>
          <legend className="visually-hidden">Diary entry details</legend>

          <label htmlFor="entry-title">Title</label>
          <input id="entry-title" name="title" value={form.title} onChange={handleChange} maxLength={120} required />

          <label htmlFor="entry-content">Content</label>
          <textarea id="entry-content" name="content" value={form.content} onChange={handleChange} maxLength={10000} rows={6} required />

          <label htmlFor="entry-date">Entry date</label>
          <input id="entry-date" name="entryDate" type="date" value={form.entryDate} onChange={handleChange} required />
          {isOutsideTrip(form.entryDate, trip) && (
            <p className="field-help" role="status">
              This date is outside the trip ({formatDate(trip.startDate)} – {formatDate(trip.endDate)}). You can still save the entry.
            </p>
          )}

          <PlaceSearch
            key={searchKey}
            idPrefix="entry"
            onSelect={(place) => {
              setForm((current) => ({ ...current, ...place }))
              setError('')
              setSuccess('')
            }}
          />

          <label htmlFor="entry-location">Location name (optional)</label>
          <input id="entry-location" name="locationName" value={form.locationName} onChange={handleChange} maxLength={150} />

          <p id="coordinates-help">Enter both coordinates or leave both blank.</p>
          <div className="coordinate-fields">
            <div>
              <label htmlFor="entry-latitude">Latitude (optional)</label>
              <input id="entry-latitude" name="latitude" type="number" min={-90} max={90} step="any" value={form.latitude} onChange={handleChange} aria-describedby="coordinates-help" />
            </div>
            <div>
              <label htmlFor="entry-longitude">Longitude (optional)</label>
              <input id="entry-longitude" name="longitude" type="number" min={-180} max={180} step="any" value={form.longitude} onChange={handleChange} aria-describedby="coordinates-help" />
            </div>
          </div>

          <EntryPhotoInput
            idPrefix="entry"
            photos={form.photos}
            onChange={(photos) => setForm((current) => ({ ...current, photos }))}
          />

          <button type="submit">{isSaving ? 'Saving…' : 'Save entry'}</button>
        </fieldset>
        {error && <p className="error-message" role="alert">{error}</p>}
        <p className="success-message" role="status">{success}</p>
      </form>
    </section>
  )
}

export default CreateEntryForm
