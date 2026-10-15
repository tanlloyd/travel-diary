import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_PHOTO_BYTES, dataUrlByteLength, preparePhoto, scaledSize } from './photos.js'

function stubResizing({ width, height, toDataURL }) {
  const close = vi.fn()
  const drawImage = vi.fn()

  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width, height, close })))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: vi.fn(),
    drawImage,
  })
  const toDataURLMock = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(toDataURL)

  return { close, drawImage, toDataURLMock }
}

describe('photo preparation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('scales the longest side down without enlarging small photos', () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(scaledSize(3000, 4000)).toEqual({ width: 1200, height: 1600 })
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('measures the decoded size of a data URL', () => {
    expect(dataUrlByteLength('data:image/png;base64,iVBORw0KGgo=')).toBe(8)
  })

  it('resizes a large photo to a smaller JPEG', async () => {
    const { close, drawImage } = stubResizing({
      width: 4000,
      height: 3000,
      toDataURL: () => 'data:image/jpeg;base64,AAAA',
    })
    const file = new File(['x'.repeat(5000)], 'beach.jpg', { type: 'image/jpeg' })

    await expect(preparePhoto(file)).resolves.toBe('data:image/jpeg;base64,AAAA')
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200)
    expect(close).toHaveBeenCalled()
  })

  it('lowers the JPEG quality until the photo fits the upload limit', async () => {
    const tooLarge = `data:image/jpeg;base64,${'A'.repeat(2_900_000)}`
    const { toDataURLMock } = stubResizing({
      width: 4000,
      height: 3000,
      toDataURL: (type, quality) => (quality > 0.8 ? tooLarge : 'data:image/jpeg;base64,AAAA'),
    })
    const file = new File(['x'.repeat(5000)], 'beach.jpg', { type: 'image/jpeg' })

    await expect(preparePhoto(file)).resolves.toBe('data:image/jpeg;base64,AAAA')
    expect(toDataURLMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the original when resizing would make the photo larger', async () => {
    stubResizing({
      width: 20,
      height: 20,
      toDataURL: () => `data:image/jpeg;base64,${'A'.repeat(400)}`,
    })
    const file = new File(['tiny'], 'icon.png', { type: 'image/png' })

    await expect(preparePhoto(file)).resolves.toMatch(/^data:image\/png;base64,/)
  })

  it('keeps the original when the browser cannot resize photos', async () => {
    const file = new File(['small photo'], 'harbour.png', { type: 'image/png' })

    await expect(preparePhoto(file)).resolves.toMatch(/^data:image\/png;base64,/)
  })

  it('rejects a photo that is still too large to save', async () => {
    const file = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], 'huge.png', { type: 'image/png' })

    await expect(preparePhoto(file)).rejects.toThrow(/could not be resized/)
  })
})
