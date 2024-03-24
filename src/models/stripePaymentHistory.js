import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      required: null,
      ref: 'invoice'
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: null
    },
    stripe_payment_id: {
      type: String,
      required: null
    },
    invoiceType: {
      type: String,
      required: null,
      enum: ['fullPayment', 'installment', 'recurring']
    },
    installment: {
      type: mongoose.Schema.Types.ObjectId,
      required: null
    },
    total_amount: {
      type: Number,
      default: 0
    },
    recurringDate: {
      type: Date,
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
export const stripePaymentHistory = model('Stripe-Payment-History', schema)
