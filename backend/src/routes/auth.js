import bcrypt from 'bcryptjs'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import authenticate from '../middleware/authenticate.js'
import Entry from '../models/Entry.js'
import Trip from '../models/Trip.js'
import User from '../models/User.js'

const authRouter = Router()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email }
}

function createToken(user) {
  return jwt.sign({ v: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, {
    subject: user._id.toString(),
    expiresIn: '7d',
  })
}

function validateRegistration(body) {
  const { name, email, password } = body ?? {}
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (typeof name !== 'string' || !name.trim() || !normalizedEmail || typeof password !== 'string') {
    return { error: 'Name, email, and password are required.' }
  }

  if (!emailPattern.test(normalizedEmail)) {
    return { error: 'Enter a valid email address.' }
  }

  if (password.length < 8 || password.length > 72) {
    return { error: 'Password must be between 8 and 72 characters.' }
  }

  return { value: { name: name.trim(), email: normalizedEmail, password } }
}

authRouter.post('/register', async (request, response) => {
  const result = validateRegistration(request.body)
  if (result.error) return response.status(400).json({ error: result.error })

  const existingUser = await User.exists({ email: result.value.email })
  if (existingUser) return response.status(409).json({ error: 'An account already exists for this email.' })

  const passwordHash = await bcrypt.hash(result.value.password, 12)
  const user = await User.create({
    name: result.value.name,
    email: result.value.email,
    passwordHash,
  })

  response.status(201).json({ user: publicUser(user), token: createToken(user) })
})

authRouter.post('/login', async (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
  const password = request.body?.password

  if (!email || typeof password !== 'string') {
    return response.status(400).json({ error: 'Email and password are required.' })
  }

  const user = await User.findOne({ email }).select('+passwordHash')
  const passwordMatches = user && await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatches) {
    return response.status(401).json({ error: 'Email or password is incorrect.' })
  }

  response.status(200).json({ user: publicUser(user), token: createToken(user) })
})

authRouter.get('/me', authenticate, async (request, response) => {
  const user = await User.findById(request.userId)
  if (!user) return response.status(401).json({ error: 'Account not found. Please sign in again.' })
  response.status(200).json({ user: publicUser(user) })
})

authRouter.put('/account/password', authenticate, async (request, response) => {
  const { currentPassword, newPassword } = request.body ?? {}

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return response.status(400).json({ error: 'Current password and new password are required.' })
  }

  if (newPassword.length < 8 || newPassword.length > 72) {
    return response.status(400).json({ error: 'Password must be between 8 and 72 characters.' })
  }

  if (newPassword === currentPassword) {
    return response.status(400).json({ error: 'Choose a new password that is different from the current one.' })
  }

  const user = await User.findById(request.userId).select('+passwordHash')
  // 403 rather than 401: the session is valid, so the client must not sign the user out.
  if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
    return response.status(403).json({ error: 'Current password is incorrect.' })
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12)
  user.tokenVersion = (user.tokenVersion ?? 0) + 1
  await user.save()

  // Every earlier token is now invalid, so return a fresh one for this session.
  response.status(200).json({ user: publicUser(user), token: createToken(user) })
})

authRouter.delete('/account', authenticate, async (request, response) => {
  const password = request.body?.password
  if (typeof password !== 'string') {
    return response.status(400).json({ error: 'Enter your password to delete your account.' })
  }

  const user = await User.findById(request.userId).select('+passwordHash')
  if (!await bcrypt.compare(password, user.passwordHash)) {
    return response.status(403).json({ error: 'Password is incorrect.' })
  }

  // Entries first, then trips, then the account, so a failure part-way through
  // leaves an account that can still sign in and try again.
  const tripIds = await Trip.find({ owner: user._id }).distinct('_id')
  const entryResult = await Entry.deleteMany({ trip: { $in: tripIds } })
  const tripResult = await Trip.deleteMany({ owner: user._id })
  await user.deleteOne()

  response.status(200).json({
    message: 'Account deleted.',
    deletedTrips: tripResult.deletedCount,
    deletedEntries: entryResult.deletedCount,
  })
})

export default authRouter
