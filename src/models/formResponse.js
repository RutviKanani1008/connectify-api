import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'
const { model, Schema } = mongoose

const schema = new Schema(
  {
    form: {
      type: mongoose.Types.ObjectId,
      ref: 'Forms',
      required: true
    },
    email: {
      type: String,
      required: false,
      default: null
    },
    response: {
      type: Object,
      default: null
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const FormResponse = model('Form-response', schema)
