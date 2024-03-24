import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    nameId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const ProductCategory = model('ProductCategory', schema)
