import { after, afterEach, before } from 'node:test'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Gives a test file its own in-memory MongoDB that is emptied after every test.
export function useMemoryDatabase() {
  let mongoServer

  before(async () => {
    mongoServer = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' } })
    await mongoose.connect(mongoServer.getUri())
  })

  afterEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
    )
  })

  after(async () => {
    await mongoose.disconnect()
    if (mongoServer) await mongoServer.stop()
  })
}
