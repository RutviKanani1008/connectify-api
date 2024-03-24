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
    massSMSId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mass-SMS'
    },
    jobId: {
      type: String,
      default: null
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sms-Template',
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    scheduledTime: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      default: 'PENDING'
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const ScheduledMassSMS = model('Scheduled-Mass-SMS', schema)
