import { useState } from 'react'
import { updateEntry } from '../services/api.js'
import { formatDate, isOutsideTrip } from '../utils/dates.js'
import EntryPhotoInput from './EntryPhotoInput.jsx'
import PlaceSearch from './PlaceSearch.jsx'

function formFromEntry(entry) {
  return {
    title: entry.title,
    content: entry.content,
    entryDate: entry.entryDate.slice(0, 10),
    locationName: entry.locationName || '',
    latitude: entry.latitude ?? '',
    longitude: entry.longitude ?? '',
    photos: entry.photos || [],
  }
}

function EditEntryForm({ tripId, trip, entry, onUpdated, onCancel }) {
  const [form, setForm] = useState(() => formFromEntry(entry))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const inputPrefix = `edit-entry-${entry._id}`

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSaving) return

    setError('')

    if (!form.title.trim() || !form.content.trim() || !form.entryDate) {
      setError('Enter a title, content, and entry date.')
      return
    }

    const latitude = String(form.latitude).trim() === '' ? null : Number(form.latitude)
    const longitude = String(form.longitude).trim() === '' ? null : Number(form.longitude)

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
      const updatedEntry = await updateEntry(tripId, entry._id, {
        ...form,
        latitude,
        longitude,
      })
      onUpdated(updatedEntry)
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="edit-entry-form" onSubmit={handleSubmit}>
      <fieldset disabled={isSaving}>
        <legend>Edit diary entry</legend>

        <label htmlFor={`${inputPrefix}-title`}>Title</label>
        <input id={`${inputPrefix}-title`} name="title" value={form.title} onChange={handleChange} maxLength={120} required />

        <label htmlFor={`${inputPrefix}-content`}>Content</label>
        <textarea id={`${inputPrefix}-content`} name="content" value={form.content} onChange={handleChange} maxLength={10000} rows={6} required />

        <label htmlFor={`${inputPrefix}-date`}>Entry date</label>
        <input id={`${inputPrefix}-date`} name="entryDate" type="date" value={form.entryDate} onChange={handleChange} required />
        {isOutsideTrip(form.entryDate, trip) && (
          <p className="field-help" role="status">
            This date is outside the trip ({formatDate(trip.startDate)} – {formatDate(trip.endDate)}). You can still save the entry.
          </p>
        )}

        <PlaceSearch
          idPrefix={inputPrefix}
          onSelect={(place) => {
            setForm((current) => ({ ...current, ...place }))
            setError('')
          }}
        />

        <label htmlFor={`${inputPrefix}-location`}>Location name (optional)</label>
        <input id={`${inputPrefix}-location`} name="locationName" value={form.locationName} onChange={handleChange} maxLength={150} />

        <p id={`${inputPrefix}-coordinates-help`}>Enter both coordinates or leave both blank.</p>
        <div className="coordinate-fields">
          <div>
            <label htmlFor={`${inputPrefix}-latitude`}>Latitude (optional)</label>
            <input id={`${inputPrefix}-latitude`} name="latitude" type="number" min={-90} max={90} step="any" value={form.latitude} onChange={handleChange} aria-describedby={`${inputPrefix}-coordinates-help`} />
          </div>
          <div>
            <label htmlFor={`${inputPrefix}-longitude`}>Longitude (optional)</label>
            <input id={`${inputPrefix}-longitude`} name="longitude" type="number" min={-180} max={180} step="any" value={form.longitude} onChange={handleChange} aria-describedby={`${inputPrefix}-coordinates-help`} />
          </div>
        </div>

        <EntryPhotoInput
          idPrefix={inputPrefix}
          photos={form.photos}
          onChange={(photos) => setForm((current) => ({ ...current, photos }))}
        />

        <div className="entry-actions">
          <button type="submit">{isSaving ? 'Saving…' : 'Save changes'}</button>
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
        </div>
      </fieldset>
      {error && <p className="error-message" role="alert">{error}</p>}
    </form>
  )
}

export default EditEntryForm
