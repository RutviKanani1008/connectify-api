import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    scheduledJobName: {
      type: String,
      required: true
    },
    contacts: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contacts' }],
      default: []
    },
    massEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mass-email'
    },
    jobId: {
      type: String,
      default: null
    },
    senderName: {
      type: String,
      default: null
    },
    senderEmail: {
      type: String,
      default: null
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email-Template',
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    delay: {
      type: String
    },
    scheduledTime: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      default: 'PENDING'
    },
    successCount: {
      type: Number,
      default: 0
    },
    failedCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const ScheduledMassEmail = model('Scheduled-Mass-email', schema)
