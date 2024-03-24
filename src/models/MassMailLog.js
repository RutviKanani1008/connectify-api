import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contacts',
      required: true
    },
    scheduleMassEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scheduled-Mass-email'
    },
    status: {
      type: String,
      default: 'PENDING'
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const MassMailLog = model('Mass-Mail-Log', schema)
