import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true
    },
    view: {
      type: String,
      enum: ['STANDARD', 'SIDE_BY_SIDE'],
      default: 'STANDARD'
    },
    defaultCCEmails: {
      type: [String],
      default: []
    },
    defaultBCCEmails: {
      type: [String],
      default: []
    },
    sidebarOpen: {
      type: Boolean,
      default: true
    },
    signature: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const CommunicationSettings = model('Communication-Settings', schema)
