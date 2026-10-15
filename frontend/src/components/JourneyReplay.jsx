import { useEffect, useMemo, useState } from 'react'
import EntryCard from './EntryCard.jsx'
import EntryMap from './EntryMap.jsx'

const STEP_DURATION_MS = 3500

function sortEntries(entries) {
  return [...entries].sort((a, b) => (
    a.entryDate.localeCompare(b.entryDate) ||
    (a.createdAt || '').localeCompare(b.createdAt || '') ||
    a._id.localeCompare(b._id)
  ))
}

function JourneyReplay({ entries }) {
  const replayEntries = useMemo(() => sortEntries(entries), [entries])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const lastIndex = replayEntries.length - 1
  const safeCurrentIndex = Math.min(currentIndex, Math.max(lastIndex, 0))
  const playbackIsRunning = (
    isPlaying &&
    replayEntries.length > 1 &&
    safeCurrentIndex < lastIndex
  )

  useEffect(() => {
    if (!playbackIsRunning) return undefined

    const timer = window.setTimeout(() => {
      const nextIndex = safeCurrentIndex + 1
      setCurrentIndex(nextIndex)
      if (nextIndex >= lastIndex) setIsPlaying(false)
    }, STEP_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [lastIndex, playbackIsRunning, safeCurrentIndex])

  if (replayEntries.length === 0) return null

  const currentEntry = replayEntries[safeCurrentIndex]
  const revealedEntries = replayEntries.slice(0, safeCurrentIndex + 1)

  function togglePlayback() {
    if (playbackIsRunning) {
      setIsPlaying(false)
      return
    }

    if (safeCurrentIndex === lastIndex) setCurrentIndex(0)
    setIsPlaying(true)
  }

  function goToPrevious() {
    setIsPlaying(false)
    setCurrentIndex(Math.max(safeCurrentIndex - 1, 0))
  }

  function goToNext() {
    setIsPlaying(false)
    setCurrentIndex(Math.min(safeCurrentIndex + 1, lastIndex))
  }

  function restart() {
    setIsPlaying(false)
    setCurrentIndex(0)
  }

  return (
    <section className="journey-replay" aria-labelledby="journey-replay-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Journey replay</p>
          <h2 id="journey-replay-heading">Replay this trip</h2>
        </div>
        <p className="replay-progress" aria-live="polite">
          Memory {safeCurrentIndex + 1} of {replayEntries.length}
        </p>
      </div>

      <p className="replay-intro">
        Move through the diary in date order to revisit each place, story, photo, and saved weather report.
      </p>

      <div className="replay-controls" aria-label="Journey replay controls">
        <button type="button" className="secondary-button" onClick={restart} disabled={safeCurrentIndex === 0}>
          Restart
        </button>
        <button type="button" className="secondary-button" onClick={goToPrevious} disabled={safeCurrentIndex === 0}>
          Previous
        </button>
        <button type="button" onClick={togglePlayback} disabled={replayEntries.length < 2}>
          {playbackIsRunning ? 'Pause replay' : safeCurrentIndex === lastIndex ? 'Play again' : 'Play replay'}
        </button>
        <button type="button" className="secondary-button" onClick={goToNext} disabled={safeCurrentIndex === lastIndex}>
          Next
        </button>
      </div>

      <EntryMap
        entries={revealedEntries}
        activeEntryId={currentEntry._id}
        eyebrow="Replay map"
        heading="The journey so far"
        showPlaceList={false}
      />

      <div className="replay-memory" key={currentEntry._id}>
        <p className="replay-current-label">Now showing</p>
        <EntryCard entry={currentEntry} readOnly />
      </div>
    </section>
  )
}

export default JourneyReplay
