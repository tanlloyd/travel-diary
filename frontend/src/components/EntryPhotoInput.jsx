import { useState } from 'react'
import { MAX_SOURCE_BYTES, preparePhoto } from '../services/photos.js'

const MAX_PHOTOS = 3
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

function descriptionFromFileName(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .slice(0, 200)
}

async function readPhoto(file) {
  return {
    dataUrl: await preparePhoto(file),
    alt: descriptionFromFileName(file.name),
  }
}

function EntryPhotoInput({ idPrefix, photos, onChange }) {
  const [error, setError] = useState('')
  const [isPreparing, setIsPreparing] = useState(false)

  async function handleFiles(event) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setError('')

    if (photos.length + files.length > MAX_PHOTOS) {
      setError(`Add no more than ${MAX_PHOTOS} photos to an entry.`)
      return
    }

    if (files.some((file) => !acceptedTypes.has(file.type))) {
      setError('Choose JPEG, PNG, or WebP photos.')
      return
    }

    if (files.some((file) => file.size > MAX_SOURCE_BYTES)) {
      setError('Each photo must be 20 MB or smaller.')
      return
    }

    setIsPreparing(true)

    try {
      const newPhotos = await Promise.all(files.map(readPhoto))
      onChange([...photos, ...newPhotos])
    } catch (error) {
      setError(error.message)
    } finally {
      setIsPreparing(false)
    }
  }

  function updateDescription(index, alt) {
    onChange(photos.map((photo, photoIndex) => (
      photoIndex === index ? { ...photo, alt } : photo
    )))
  }

  function removePhoto(index) {
    setError('')
    onChange(photos.filter((_, photoIndex) => photoIndex !== index))
  }

  return (
    <div className="photo-input">
      <label htmlFor={`${idPrefix}-photos`}>Photos (optional)</label>
      <input
        id={`${idPrefix}-photos`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        aria-describedby={`${idPrefix}-photos-help`}
        disabled={photos.length >= MAX_PHOTOS || isPreparing}
      />
      <p id={`${idPrefix}-photos-help`} className="field-help">
        Add up to {MAX_PHOTOS} JPEG, PNG, or WebP photos. Large photos are resized before they are saved.
      </p>
      {isPreparing && <p role="status">Preparing photos…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}

      {photos.length > 0 && (
        <div className="photo-preview-list" aria-label="Selected photos">
          {photos.map((photo, index) => (
            <div className="photo-preview" key={`${photo.dataUrl.slice(-24)}-${index}`}>
              <img src={photo.dataUrl} alt={photo.alt || `Selected photo ${index + 1}`} />
              <label htmlFor={`${idPrefix}-photo-description-${index}`}>
                Photo description (optional)
              </label>
              <input
                id={`${idPrefix}-photo-description-${index}`}
                value={photo.alt}
                onChange={(event) => updateDescription(index, event.target.value)}
                maxLength={200}
              />
              <button type="button" className="secondary-button" onClick={() => removePhoto(index)}>
                Remove photo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EntryPhotoInput
