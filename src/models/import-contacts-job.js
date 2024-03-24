import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

export const IMPORT_CONTACTS_STATUS = {
  pending: 'pending',
  success: 'success',
  error: 'error'
}
const schema = new Schema(
  {
    status: {
      type: String,
      required: true,
      default: IMPORT_CONTACTS_STATUS.pending,
      enum: Object.values(IMPORT_CONTACTS_STATUS)
    },
    errorReason: {
      type: String,
      required: false,
      default: null
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
    },
    job: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const ImportContactsJob = model('Import-Contacts-Job', schema)
