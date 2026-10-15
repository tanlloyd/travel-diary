import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../src/app.js'

process.env.JWT_SECRET = 'browser-test-secret-with-at-least-32-characters'

const port = Number(process.env.PORT) || 3001
const mongoServer = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' } })
await mongoose.connect(mongoServer.getUri())

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Browser test backend listening on port ${port}`)
})

async function stop() {
  server.close(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
    process.exit(0)
  })
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
