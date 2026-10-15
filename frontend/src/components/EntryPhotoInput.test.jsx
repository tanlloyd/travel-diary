import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import EntryPhotoInput from './EntryPhotoInput.jsx'

function PhotoInputExample() {
  const [photos, setPhotos] = useState([])
  return <EntryPhotoInput idPrefix="test-entry" photos={photos} onChange={setPhotos} />
}

describe('EntryPhotoInput', () => {
  it('previews an uploaded photo, creates a description, and removes it', async () => {
    const user = userEvent.setup()
    render(<PhotoInputExample />)

    const file = new File(['small photo'], 'sydney-harbour.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Photos (optional)'), file)

    expect(await screen.findByRole('img', { name: 'sydney harbour' })).toBeInTheDocument()
    expect(screen.getByLabelText('Photo description (optional)')).toHaveValue('sydney harbour')

    await user.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(screen.queryByRole('img', { name: 'sydney harbour' })).not.toBeInTheDocument()
  })

  it('rejects unsupported files with a useful message', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PhotoInputExample />)

    const file = new File(['vector photo'], 'map.svg', { type: 'image/svg+xml' })
    await user.upload(screen.getByLabelText('Photos (optional)'), file)

    expect(screen.getByRole('alert')).toHaveTextContent('Choose JPEG, PNG, or WebP photos.')
  })
})
