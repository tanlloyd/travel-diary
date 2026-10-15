import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import errorHandler from './middleware/errorHandler.js'
import authenticate from './middleware/authenticate.js'
import { createAuthLimiters } from './middleware/rateLimiters.js'
import unknownEndpoint from './middleware/unknownEndpoint.js'
import authRouter from './routes/auth.js'
import healthRouter from './routes/health.js'
import publicTripsRouter from './routes/publicTrips.js'
import tripsRouter from './routes/trips.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDistPath = path.resolve(currentDirectory, '../../frontend/dist')

// Photos travel as data URLs inside diary-entry requests. No other request needs a large body.
const SMALL_BODY_LIMIT = '100kb'
const ENTRY_BODY_LIMIT = '10mb'

// The browser loads map tiles from OpenStreetMap, shows photos from data URLs,
// and calls Open-Meteo for place search. Everything else must come from this origin.
const contentSecurityPolicy = {
  directives: {
    'img-src': ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
    'connect-src': ["'self'", 'https://geocoding-api.open-meteo.com'],
    // The host already redirects to HTTPS. Leaving this out keeps a production
    // build usable over plain HTTP on a development machine.
    'upgrade-insecure-requests': null,
  },
}

function trustedProxyHops() {
  const hops = Number(process.env.TRUST_PROXY)
  return process.env.TRUST_PROXY && Number.isInteger(hops) && hops >= 0 ? hops : 1
}

export function createApp({ authRateLimits } = {}) {
  const app = express()
  const isProduction = process.env.NODE_ENV === 'production'

  // In production the app sits behind the host's proxy, so the client address
  // comes from X-Forwarded-For. Rate limits are counted per client address.
  if (isProduction) app.set('trust proxy', trustedProxyHops())

  app.use(helmet({ contentSecurityPolicy }))

  if (!isProduction) {
    app.use(cors())
  } else if (process.env.CORS_ORIGIN) {
    const allowedOrigins = process.env.CORS_ORIGIN
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)

    app.use(cors({ origin: allowedOrigins }))
  }

  const authLimiters = createAuthLimiters(authRateLimits)

  app.use('/api', healthRouter)
  app.use('/api/auth/login', authLimiters.login)
  app.use('/api/auth/register', authLimiters.register)
  app.use('/api/auth/account', authLimiters.account)
  app.use('/api/auth', express.json({ limit: SMALL_BODY_LIMIT }), authRouter)
  app.use('/api/public/trips', publicTripsRouter)
  // Authenticate first so an anonymous client cannot make the server parse a large body.
  app.use('/api/trips', authenticate, express.json({ limit: ENTRY_BODY_LIMIT }), tripsRouter)

  if (isProduction) {
    app.use(express.static(frontendDistPath))
    app.use((request, response, next) => {
      if (request.method !== 'GET' || request.path.startsWith('/api')) {
        next()
        return
      }

      response.sendFile(path.join(frontendDistPath, 'index.html'), (error) => {
        if (error) next(error)
      })
    })
  }

  app.use(unknownEndpoint)
  app.use(errorHandler)

  return app
}

export default createApp()
