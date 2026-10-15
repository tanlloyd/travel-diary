import { useId } from 'react'
import EntryCard from './EntryCard.jsx'
import { formatDate } from '../utils/dates.js'

function groupEntries(entries) {
  const sorted = [...entries].sort((a, b) => (
    a.entryDate.slice(0, 10).localeCompare(b.entryDate.slice(0, 10)) ||
    (a.createdAt || '').localeCompare(b.createdAt || '') ||
    a._id.localeCompare(b._id)
  ))
  const groups = []

  for (const entry of sorted) {
    const date = entry.entryDate.slice(0, 10)
    const previous = groups.at(-1)
    if (previous?.date === date) previous.entries.push(entry)
    else groups.push({ date, entries: [entry] })
  }

  return groups
}

function dayLabel(date, trip) {
  const start = trip.startDate.slice(0, 10)
  const end = trip.endDate.slice(0, 10)
  if (date < start) return 'Before the trip'
  if (date > end) return 'After the trip'

  // Count calendar dates in UTC, independent of local timezone and daylight saving.
  const day = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1
  return `Day ${String(day).padStart(2, '0')}`
}

function DiaryTimeline({ entries, tripId, trip, onUpdated, onDeleted }) {
  const timelineId = useId()
  const groups = groupEntries(entries)
  if (groups.length === 0) return null

  return (
    <ol className="diary-timeline" aria-label="Diary timeline" role="list">
      {groups.map((group) => (
        <li className="diary-timeline-day" key={group.date} aria-labelledby={`${timelineId}-${group.date}`}>
          <div className="diary-timeline-date">
            <p id={`${timelineId}-${group.date}`}>
              <span className="diary-day-label">{dayLabel(group.date, trip)}</span>
              <time dateTime={group.date}>{formatDate(group.date)}</time>
            </p>
            <p className="diary-day-count">
              {group.entries.length} {group.entries.length === 1 ? 'memory' : 'memories'}
            </p>
          </div>
          <div className="entry-list">
            {group.entries.map((entry) => (
              <EntryCard
                key={entry._id}
                tripId={tripId}
                trip={trip}
                entry={entry}
                onUpdated={onUpdated}
                onDeleted={onDeleted}
              />
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default DiaryTimeline
