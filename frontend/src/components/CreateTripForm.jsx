import { useState } from 'react'
import { createTrip } from '../services/api.js'

const emptyForm = {
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  description: '',
  isPublic: false,
}

function CreateTripForm({ onCreated, disabled = false }) {
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(event) {
    const { checked, name, type, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSaving || disabled) return

    setError('')
    setSuccess('')

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
      const trip = await createTrip(form)
      onCreated(trip)
      setForm(emptyForm)
      setSuccess('Trip saved.')
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="trip-form-panel" aria-labelledby="create-trip-heading">
      <h2 id="create-trip-heading">Create a trip</h2>
      <p>All fields are required except the description.</p>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSaving || disabled}>
          <legend className="visually-hidden">Trip details</legend>
          <label htmlFor="trip-name">Trip name</label>
          <input id="trip-name" name="name" value={form.name} onChange={handleChange} maxLength={100} required />

          <label htmlFor="trip-destination">Destination</label>
          <input id="trip-destination" name="destination" value={form.destination} onChange={handleChange} maxLength={150} required />

          <div className="date-fields">
            <div>
              <label htmlFor="trip-start-date">Start date</label>
              <input id="trip-start-date" name="startDate" type="date" value={form.startDate} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="trip-end-date">End date</label>
              <input id="trip-end-date" name="endDate" type="date" value={form.endDate} min={form.startDate || undefined} onChange={handleChange} required />
            </div>
          </div>

          <label htmlFor="trip-description">Description (optional)</label>
          <textarea id="trip-description" name="description" value={form.description} onChange={handleChange} maxLength={2000} rows={4} />

          <label className="privacy-control" htmlFor="trip-public">
            <input
              id="trip-public"
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

          <button type="submit">{isSaving ? 'Saving…' : 'Save trip'}</button>
        </fieldset>
        {error && <p className="error-message" role="alert">{error}</p>}
        <p className="success-message" role="status">{success}</p>
      </form>
    </section>
  )
}

export default CreateTripForm
