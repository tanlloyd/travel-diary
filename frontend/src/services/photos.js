export const MAX_PHOTO_BYTES = 2 * 1024 * 1024
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024
export const MAX_DIMENSION = 1600

const JPEG_QUALITIES = [0.82, 0.7, 0.55]

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read that photo. Please try again.'))
    reader.readAsDataURL(file)
  })
}

export function dataUrlByteLength(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

export function scaledSize(width, height, maxDimension = MAX_DIMENSION) {
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

// Returns a resized JPEG data URL, or null when this browser cannot resize the photo.
async function resizeToJpeg(file) {
  if (typeof createImageBitmap !== 'function') return null

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  try {
    const { width, height } = scaledSize(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return null

    // JPEG has no transparency, so transparent areas are shown on white.
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)

    let resized = null
    for (const quality of JPEG_QUALITIES) {
      resized = canvas.toDataURL('image/jpeg', quality)
      if (!resized.startsWith('data:image/jpeg')) return null
      if (dataUrlByteLength(resized) <= MAX_PHOTO_BYTES) break
    }

    return resized
  } finally {
    bitmap.close?.()
  }
}

// Phone photos are usually several megabytes. Resizing them in the browser keeps
// uploads fast and stops diary pages from downloading the full-size originals.
export async function preparePhoto(file) {
  const [original, resized] = await Promise.all([readAsDataUrl(file), resizeToJpeg(file)])
  const dataUrl = resized && resized.length < original.length ? resized : original

  if (dataUrlByteLength(dataUrl) > MAX_PHOTO_BYTES) {
    throw new Error('That photo is larger than 2 MB and could not be resized. Try a smaller photo.')
  }

  return dataUrl
}
