import mongoose from 'mongoose'

const tripSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Trip name is required.'],
      trim: true,
      maxlength: [100, 'Trip name must be 100 characters or fewer.'],
    },
    destination: {
      type: String,
      required: [true, 'Destination is required.'],
      trim: true,
      maxlength: [150, 'Destination must be 150 characters or fewer.'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required.'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required.'],
      validate: {
        validator(value) {
          return !this.startDate || value >= this.startDate
        },
        message: 'End date cannot be before start date.',
      },
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description must be 2,000 characters or fewer.'],
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    // Random value used in the public sharing link. It is created the first time
    // a trip is made public and can be replaced to stop an old link from working.
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true },
)

export default mongoose.model('Trip', tripSchema)
