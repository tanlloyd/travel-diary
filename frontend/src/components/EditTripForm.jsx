import { useState } from 'react'
import { updateTrip } from '../services/api.js'

function formFromTrip(trip) {
  return {
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate.slice(0, 10),
    endDate: trip.endDate.slice(0, 10),
    description: trip.description || '',
    isPublic: Boolean(trip.isPublic),
  }
}

function EditTripForm({ trip, onUpdated, onCancel }) {
  const [form, setForm] = useState(() => formFromTrip(trip))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  function handleChange(event) {
    const { checked, name, type, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSaving) return

    setError('')

    if (!form.name.trim() || !form.destination.trim() || !form.startDate || !form.endDate) {
      setError('Enter a trip name, destination, start date, and end date.')
      return
    }

    if (form.endDate < form.startDate) {
      setError('End date cannot be before start date.')
      return
    }

    setIsSaving(true)

    try {
      const updatedTrip = await updateTrip(trip._id, form)
      onUpdated(updatedTrip)
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="trip-form-panel" aria-labelledby="edit-trip-heading">
      <h2 id="edit-trip-heading">Edit trip</h2>
      <p>All fields are required except the description.</p>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSaving}>
          <legend className="visually-hidden">Edit trip details</legend>

          <label htmlFor="edit-trip-name">Trip name</label>
          <input id="edit-trip-name" name="name" value={form.name} onChange={handleChange} maxLength={100} required />

          <label htmlFor="edit-trip-destination">Destination</label>
          <input id="edit-trip-destination" name="destination" value={form.destination} onChange={handleChange} maxLength={150} required />

          <div className="date-fields">
            <div>
              <label htmlFor="edit-trip-start-date">Start date</label>
              <input id="edit-trip-start-date" name="startDate" type="date" value={form.startDate} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="edit-trip-end-date">End date</label>
              <input id="edit-trip-end-date" name="endDate" type="date" value={form.endDate} min={form.startDate || undefined} onChange={handleChange} required />
            </div>
          </div>

          <label htmlFor="edit-trip-description">Description (optional)</label>
          <textarea id="edit-trip-description" name="description" value={form.description} onChange={handleChange} maxLength={2000} rows={4} />

          <label className="privacy-control" htmlFor="edit-trip-public">
            <input
              id="edit-trip-public"
              name="isPublic"
              type="checkbox"
              checked={form.isPublic}
              onChange={handleChange}
            />
            <span>
              Make this trip public
              <small>Anyone with the sharing link can view the trip and its diary entries.</small>
            </span>
          </label>

          <div className="trip-actions">
            <button type="submit">{isSaving ? 'Saving…' : 'Save changes'}</button>
            <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          </div>
        </fieldset>
        {error && <p className="error-message" role="alert">{error}</p>}
      </form>
    </section>
  )
}

export default EditTripForm
