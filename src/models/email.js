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
    email: {
      type: String,
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true
    },
    mail_provider: {
      type: String,
      required: true
    },
    from: {
      type: Object,
      required: true
    },
    to: {
      type: Object,
      required: true
    },
    folders: {
      type: [{ type: String }],
      required: true
    },
    flags: {
      type: [{ type: String }],
      required: true
    },
    message_id: {
      type: String
    },
    emailUid: {
      type: [{ mailBox: { type: String }, uuId: { type: Number } }]
    },
    cc: {
      type: Object
    },
    bcc: {
      type: Object
    },
    subject: {
      type: String
    },
    html: {
      type: String
    },
    text: {
      type: String
    },
    attachments: {
      type: Object
    },
    mail_provider_thread_id: {
      type: String,
      required: false
    },
    send_date: {
      type: Date,
      required: true
    },
    is_read: {
      type: Boolean,
      default: false,
      required: true
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tasks'
    }
  },
  {
    timestamps: true
  }
)

// schema.index({ company: 1, user: 1, email: 1 })
// schema.index({ mail_provider_thread_id: 1, send_date: -1 })

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Email = model('Email', schema)
