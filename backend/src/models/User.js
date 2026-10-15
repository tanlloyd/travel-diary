import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      maxlength: [80, 'Name must be 80 characters or fewer.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: [254, 'Email must be 254 characters or fewer.'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    // Increased whenever the password changes, so tokens issued before the
    // change stop working. Accounts created earlier count as version 0.
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)
