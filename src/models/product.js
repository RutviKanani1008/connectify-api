import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    productId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: null
    },
    description: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['one-time', 'recurring'],
      default: 'one-time'
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductCategory',
      default: null
    },
    price: {
      type: String
    },
    active: {
      type: Boolean,
      default: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
    },
    stripe_product_id: {
      type: String
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Products = model('Products', schema)
