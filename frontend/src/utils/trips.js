export const TRIP_SORT_OPTIONS = [
  { value: 'newest', label: 'Recently added' },
  { value: 'start-asc', label: 'Start date: earliest first' },
  { value: 'start-desc', label: 'Start date: latest first' },
  { value: 'name', label: 'Name: A to Z' },
]

const comparators = {
  newest: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
  'start-asc': (a, b) => a.startDate.localeCompare(b.startDate),
  'start-desc': (a, b) => b.startDate.localeCompare(a.startDate),
  name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
}

// Matches every word of the search against the trip's name, destination, and description.
export function filterTrips(trips, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return trips

  return trips.filter((trip) => {
    const text = `${trip.name} ${trip.destination} ${trip.description || ''}`.toLowerCase()
    return words.every((word) => text.includes(word))
  })
}

export function sortTrips(trips, sortBy) {
  const compare = comparators[sortBy] || comparators.newest
  return [...trips].sort(compare)
}
