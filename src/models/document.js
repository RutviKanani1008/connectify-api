import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose
const documentSchema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    document: {
      type: String,
      default: ''
    },
    documentURL: {
      type: String,
      default: ''
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contacts',
      default: null
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    },
    order: {
      type: Number,
      required: true
    },
    archived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

documentSchema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Document = model('documents', documentSchema)
