function unknownEndpoint(request, response) {
  response.status(404).json({ error: 'Unknown endpoint' })
}

export default unknownEndpoint
