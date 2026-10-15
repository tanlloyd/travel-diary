import mongoose from 'mongoose'

const weatherSchema = new mongoose.Schema(
  {
    code: { type: Number, required: true },
    condition: { type: String, required: true },
    temperatureMax: { type: Number, required: true },
    temperatureMin: { type: Number, required: true },
    precipitation: { type: Number, required: true },
    fetchedAt: { type: Date, required: true },
    source: { type: String, required: true, default: 'Open-Meteo' },
  },
  { _id: false },
)

const photoSchema = new mongoose.Schema(
  {
    dataUrl: {
      type: String,
      required: true,
      maxlength: [2800000, 'Each photo must be 2 MB or smaller.'],
    },
    alt: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Photo description must be 200 characters or fewer.'],
    },
  },
  { _id: false },
)

const entrySchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      maxlength: [120, 'Title must be 120 characters or fewer.'],
    },
    content: {
      type: String,
      required: [true, 'Content is required.'],
      trim: true,
      maxlength: [10000, 'Content must be 10,000 characters or fewer.'],
    },
    entryDate: {
      type: Date,
      required: [true, 'Entry date is required.'],
    },
    locationName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [150, 'Location name must be 150 characters or fewer.'],
    },
    latitude: {
      type: Number,
      default: null,
      required() {
        return this.longitude != null
      },
      min: [-90, 'Latitude must be between -90 and 90.'],
      max: [90, 'Latitude must be between -90 and 90.'],
    },
    longitude: {
      type: Number,
      default: null,
      required() {
        return this.latitude != null
      },
      min: [-180, 'Longitude must be between -180 and 180.'],
      max: [180, 'Longitude must be between -180 and 180.'],
    },
    weather: {
      type: weatherSchema,
      default: null,
    },
    photos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: (photos) => photos.length <= 3,
        message: 'Add no more than 3 photos to an entry.',
      },
    },
  },
  { timestamps: true },
)

// Every entry query filters by trip and sorts by date, so index that path.
entrySchema.index({ trip: 1, entryDate: 1, createdAt: 1 })

export default mongoose.model('Entry', entrySchema)
