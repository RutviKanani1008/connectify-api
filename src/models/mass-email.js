import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    contacts: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contacts' }],
      default: []
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
    active: {
      type: Boolean,
      default: true
    },
    saveAs: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const MassEmail = model('Mass-email', schema)
