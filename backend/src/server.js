import 'dotenv/config'
import app from './app.js'
import connectDB from './config/db.js'

const port = Number(process.env.PORT) || 3001

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required. Add a strong secret to backend/.env.')
  process.exit(1)
}

try {
  await connectDB()
  console.log('Connected to MongoDB')

  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`)
  })
} catch {
  // Connection errors can contain credentials, so do not print the original error.
  console.error('Could not connect to MongoDB. Check MONGODB_URI in backend/.env and make sure the database is reachable.')
  process.exit(1)
}
