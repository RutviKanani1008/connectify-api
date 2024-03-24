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
    directMailTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Direct-Mail-Template',
      required: true
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
export const DirectMail = model('Direct-Mail', schema)
