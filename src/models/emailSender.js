import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    email: {
      type: String,
      required: true
    },
    status: { type: String, enum: ['Pending', 'Verified'], default: 'Pending' },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const EmailSender = model('EmailSender', schema)
