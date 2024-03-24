import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    totalAmount: {
      type: Number,
      required: true
    },
    customerDetails: {
      type: Object,
      required: true
    },
    orderDetails: {
      type: Object,
      required: true
    },
    shippingDetails: {
      type: Object,
      required: true
    },
    paymentDetails: {
      type: Object,
      default: null
    },
    orderNumber: {
      type: String,
      required: true
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
export const InventoryOfflineOrder = model('InventoryOfflineOrder', schema)
