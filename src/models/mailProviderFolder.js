import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose
const schema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Companies',
    required: true
  },
  mailProvider: {
    type: String,
    required: true
  },
  providerSelection: {
    type: Object,
    required: true
  }
})

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const MailProviderFolder = model('MailProviderFolder', schema)
