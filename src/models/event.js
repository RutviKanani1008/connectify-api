import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: false
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    start: {
      type: Date,
      default: new Date()
    },
    end: {
      type: Date,
      default: null
    },
    slug: {
      type: String,
      default: null
    },
    contacts: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contacts' }],
      default: []
    },
    attendance: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contacts' }],
      default: []
    },
    color: {
      type: String,
      default: 'Color1'
    },
    rsvpFormInfo: {
      showLogo: { type: Boolean, default: true },
      showLogoName: { type: Boolean, default: true }
    },
    recurrenceId: {
      type: String
    }
  },
  {
    timestamps: true
  }
)
schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Event = model('Event', schema)
