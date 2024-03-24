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
    type: {
      type: String,
      default: null
    },
    host: {
      type: String,
      default: null
    },
    port: {
      type: Number,
      default: null
    },
    secure: {
      type: Boolean,
      default: null
    },
    username: {
      type: String,
      required: true
    },
    password: {
      type: String,
      default: null
    },
    otherDetails: {
      type: Object,
      default: null
    },
    isMapped: {
      type: Object,
      default: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const SmtpImapCredential = model('Smtp-Imap-Credential', schema)
