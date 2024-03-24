import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    paymentMethodId: {
      type: String
    },
    name: {
      type: String
    },
    brand: {
      type: String
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contacts'
    },
    cardLast4DigitNo: {
      type: String
    },
    expMonth: {
      type: Number
    },
    expYear: {
      type: Number
    },
    address: {
      type: String
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true
    }
  },
  { timestamps: true }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })

export const PaymentMethod = model('PaymentMethods', schema)
