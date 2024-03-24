import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    data: {
      type: Object,
      required: true
    },
    contactErrors: {
      type: {
        isDuplicateEmail: { type: Boolean, default: false },
        isInvalidEmail: { type: Boolean, default: false },
        isEmailNotExists: { type: Boolean, default: false },
        isNameNotExists: { type: Boolean, default: false },
        isContactAlreadyExists: { type: Boolean, default: false }
      },
      default: null
    },
    importedContact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Import-Contacts-Jobs'
    },
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
export const ImportContacts = model('Import-Contacts', schema)
