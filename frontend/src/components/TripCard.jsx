import { Link } from 'react-router-dom'
import { formatDate } from '../utils/dates.js'

function TripCard({ trip }) {
  const days = Math.round((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000) + 1
  const palette = [...trip._id].reduce((total, letter) => total + letter.charCodeAt(0), 0) % 3

  return (
    <article className={`trip-card trip-card-palette-${palette}`}>
      <div className="trip-card-cover" aria-hidden="true">
        <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="220" className="cover-sky" />
          <circle cx="300" cy="65" r="30" className="cover-sun" />
          <path d="M0 150 Q70 60 160 135 T400 100 V220 H0Z" className="cover-hill-back" />
          <path d="M0 175 Q100 120 210 180 T400 140 V220 H0Z" className="cover-hill-front" />
          <path d="M135 220 Q260 170 210 150 T250 105" className="cover-trail" />
        </svg>
        <span className="trip-cover-label">Travel diary</span>
        <span className="trip-cover-year">{trip.startDate.slice(0, 4)}</span>
      </div>
      <div className="trip-card-body">
        <div className="trip-card-meta">
          <p className="trip-destination">{trip.destination}</p>
          <span className={`privacy-badge ${trip.isPublic ? 'privacy-badge-public' : ''}`}>
            {trip.isPublic ? 'Public' : 'Private'}
          </span>
        </div>
        <h3>{trip.name}</h3>
        <p className="trip-dates">
          <time dateTime={trip.startDate.slice(0, 10)}>{formatDate(trip.startDate)}</time>
          {' – '}
          <time dateTime={trip.endDate.slice(0, 10)}>{formatDate(trip.endDate)}</time>
        </p>
        <p className="trip-description">{trip.description || 'A new chapter, waiting for your memories.'}</p>
        <div className="trip-card-footer">
          <span className="trip-duration">{days} {days === 1 ? 'day' : 'days'}</span>
          <Link className="card-link" to={`/trips/${trip._id}`}>
            View trip<span className="visually-hidden">: {trip.name}</span> <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </article>
  )
}

export default TripCard
