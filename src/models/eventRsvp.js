import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contacts',
      default: null
    },
    are_you_coming: {
      type: String,
      required: false,
      default: null
    },
    reason: {
      type: String,
      required: false,
      default: null
    },
    are_you_bringing_any_guests: {
      type: Boolean,
      default: false,
      required: false
    },
    number_of_guest: {
      type: Number,
      default: null,
      required: false
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const EventRSVP = model('EventRSVP', schema)
