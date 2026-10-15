import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../services/places.js'

function placeLabel(place) {
  return [place.name, place.admin1, place.country]
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(', ')
}

function roundCoordinate(value) {
  // Five decimal places is about one metre, which is plenty for a diary entry.
  return String(Math.round(value * 100000) / 100000)
}

function PlaceSearch({ idPrefix, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const activeSearch = useRef(null)
  const isMounted = useRef(true)
  const canLocate = typeof navigator !== 'undefined' && Boolean(navigator.geolocation)

  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
      activeSearch.current?.abort()
      activeSearch.current = null
    }
  }, [])

  function handleQueryChange(event) {
    activeSearch.current?.abort()
    activeSearch.current = null
    setQuery(event.target.value)
    setResults([])
    setIsSearching(false)
    setMessage('')
    setError('')
  }

  async function handleSearch() {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 3) {
      setError('Enter at least three characters to find a place.')
      setResults([])
      return
    }

    activeSearch.current?.abort()
    const controller = new AbortController()
    activeSearch.current = controller
    setIsSearching(true)
    setResults([])
    setMessage('')
    setError('')

    try {
      const places = await searchPlaces(trimmedQuery, controller.signal)
      if (activeSearch.current !== controller) return
      setResults(places)
      if (places.length === 0) setMessage('No places found. Try a nearby city or enter coordinates manually.')
    } catch (searchError) {
      if (activeSearch.current === controller && searchError.name !== 'AbortError') {
        setError(searchError.message)
      }
    } finally {
      if (activeSearch.current === controller) {
        activeSearch.current = null
        setIsSearching(false)
      }
    }
  }

  function handleUseLocation() {
    if (isLocating) return

    activeSearch.current?.abort()
    activeSearch.current = null
    setIsSearching(false)
    setIsLocating(true)
    setResults([])
    setMessage('')
    setError('')

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isMounted.current) return
        onSelect({
          latitude: roundCoordinate(coords.latitude),
          longitude: roundCoordinate(coords.longitude),
        })
        setMessage('Your current coordinates are filled below. Add a location name if you like.')
        setIsLocating(false)
      },
      (locationError) => {
        if (!isMounted.current) return
        setError(locationError.code === 1
          ? 'Location access was not allowed. Search for a place or enter coordinates instead.'
          : 'Your location could not be found. Search for a place or enter coordinates instead.')
        setIsLocating(false)
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  function handleSelect(place) {
    const label = placeLabel(place)
    onSelect({
      locationName: label.slice(0, 150),
      latitude: String(place.latitude),
      longitude: String(place.longitude),
    })
    setQuery(label)
    setResults([])
    setMessage('Place selected. Its coordinates are filled below.')
    setError('')
  }

  return (
    <div className="place-search">
      <label htmlFor={`${idPrefix}-place-search`}>Find a city or place (optional)</label>
      <div className="place-search-controls">
        <input
          id={`${idPrefix}-place-search`}
          type="search"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSearch()
            }
          }}
          placeholder="e.g. Sydney, Australia"
          autoComplete="off"
        />
        <button type="button" className="secondary-button" onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Find place'}
        </button>
      </div>
      {canLocate && (
        <button
          type="button"
          className="secondary-button place-search-location"
          onClick={handleUseLocation}
          disabled={isLocating}
        >
          {isLocating ? 'Finding your location…' : 'Use my current location'}
        </button>
      )}
      {isSearching && <p role="status">Searching for places…</p>}
      {message && <p role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {results.length > 0 && (
        <div className="place-search-results">
          <p>Choose a place:</p>
          <ul>
            {results.map((place) => (
              <li key={place.id}>
                <button type="button" className="secondary-button" onClick={() => handleSelect(place)}>
                  {placeLabel(place)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="field-help">
        Search uses Open-Meteo city and place data. Your current location is read by your browser only when you ask, and is not saved until you save the entry. You can edit the location name and coordinates below.
      </p>
    </div>
  )
}

export default PlaceSearch
