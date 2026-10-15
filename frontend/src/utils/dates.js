// Dates are stored as UTC midnight, so format them in UTC to avoid showing the previous day.
export function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// Returns true when a YYYY-MM-DD date falls outside the trip's start and end dates.
export function isOutsideTrip(date, trip) {
  if (!date || !trip?.startDate || !trip?.endDate) return false
  return date < trip.startDate.slice(0, 10) || date > trip.endDate.slice(0, 10)
}
