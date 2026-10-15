import mongoose from 'mongoose'

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Set MONGODB_URI in backend/.env before starting the server.')
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
}

export default connectDB
