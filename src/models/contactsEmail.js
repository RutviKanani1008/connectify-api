import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    subject: {
      type: String,
      required: true
    },
    htmlBody: {
      type: String,
      default: null
    },
    jsonBody: {
      type: String,
      default: null
    },
    emailTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email-Template',
      required: false,
      default: null
    },
    bcc: {
      type: Array,
      default: []
      // required: true
    },
    cc: {
      type: Array,
      default: []
    },
    attachments: {
      type: [
        {
          fileName: { type: String, default: '' },
          fileUrl: { type: String, default: '' }
        }
      ],
      default: []
    },
    scheduledTime: {
      type: Date,
      default: null
    },
    jobId: {
      type: String,
      default: null
    },
    status: {
      type: String,
      default: 'PENDING'
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contacts',
      default: null
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users'
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const ContactsEmail = model('Contact-email', schema)
