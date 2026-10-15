function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error)
  }

  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map((field) => field.message).join(' ')
    return response.status(400).json({ error: message })
  }

  if (error.code === 11000) {
    return response.status(409).json({ error: 'An account already exists for this email.' })
  }

  if (error.type === 'entity.too.large') {
    return response.status(413).json({ error: 'The request is too large. Try fewer or smaller photos.' })
  }

  const statusCode = error.statusCode || error.status || 500
  const message = statusCode >= 500
    ? 'Something went wrong. Please try again.'
    : error.type === 'entity.parse.failed'
      ? 'Request body must be valid JSON.'
      : error.message || 'Invalid request.'

  response.status(statusCode).json({ error: message })
}

export default errorHandler
