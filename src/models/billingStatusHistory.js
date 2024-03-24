import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    recordRelationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    type: {
      type: String,
      enum: ['Invoice', 'Quote']
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'Paid', 'Cancelled', 'Expired', 'Discuss', 'RequestChanges', 'Approve', 'Deny']
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
export const BillingStatusHistory = model('BillingStatusHistory', schema)
