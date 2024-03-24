import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    total: {
      type: String,
      required: true
    },
     total_tax: {
      type: String,
      default: null
    },
    shipping_tax: {
      type: String,
      default: null
    },
    customerDetails: {
      type: Object,
      default: null
    },
    billing: {
      type: Object,
      default: null
    },
    shipping: {
      type: Object,
      default: null
    },
    payment_method: {
      type: String,
      default: null
    },
    status: {
      type: String,
      default: null
    },
    number: {
      type: String,
      required: true
    },
    wooID: {
      type: String,
      required: true
    },
    orderDetails: {
      type: Object,
      default: null
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const InventoryOnlineOrder = model('InventoryOnlineOrder', schema)
