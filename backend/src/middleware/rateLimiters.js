import { rateLimit } from 'express-rate-limit'

const FIFTEEN_MINUTES = 15 * 60 * 1000
const ONE_HOUR = 60 * 60 * 1000

function createLimiter({ windowMs, limit, error, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error },
  })
}

// Password hashing is deliberately slow, so unlimited sign-in attempts would let
// one client guess passwords and tie up the server at the same time.
export function createAuthLimiters({ loginLimit = 20, registerLimit = 30 } = {}) {
  return {
    // Only failed attempts count, so signing in normally never uses up the allowance.
    login: createLimiter({
      windowMs: FIFTEEN_MINUTES,
      limit: loginLimit,
      skipSuccessfulRequests: true,
      error: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
    }),
    // Changing a password or deleting an account also checks a password.
    account: createLimiter({
      windowMs: FIFTEEN_MINUTES,
      limit: loginLimit,
      skipSuccessfulRequests: true,
      error: 'Too many incorrect password attempts. Please wait 15 minutes and try again.',
    }),
    register: createLimiter({
      windowMs: ONE_HOUR,
      limit: registerLimit,
      error: 'Too many accounts created from this network. Please try again later.',
    }),
  }
}
