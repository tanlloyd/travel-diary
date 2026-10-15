import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const INVALID_SESSION = 'Your session is invalid or has expired. Please sign in again.'

async function authenticate(request, response, next) {
  const authorization = request.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Authentication required.' })
  }

  let payload
  try {
    payload = jwt.verify(authorization.slice(7), process.env.JWT_SECRET)
  } catch {
    return response.status(401).json({ error: INVALID_SESSION })
  }

  // A signed token is not enough on its own: the account may have been deleted,
  // or its password changed, since the token was issued.
  const user = await User.findById(payload.sub).select('tokenVersion')
  if (!user || (payload.v ?? 0) !== (user.tokenVersion ?? 0)) {
    return response.status(401).json({ error: INVALID_SESSION })
  }

  request.userId = payload.sub
  next()
}

export default authenticate
