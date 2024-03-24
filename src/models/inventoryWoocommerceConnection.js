import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    url: {
      type: String,
      required: true
    },
    consumerKey: {
      type: String,
      required: true
    },
    consumerSecret: {
      type: String,
      required: true
    },
    instructions: {
      type: Object,
      default: null
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
export const InventoryWoocommerceConnection = model('InventoryWoocommerceConnection', schema)
