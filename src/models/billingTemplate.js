import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

export const billingTemplateTypes = {
  TERMS_AND_CONDITION: 'termsAndCondition'
}

const billingTemplateSchema = new Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Companies' },
    name: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, required: true }
  },
  { timestamps: true }
)

billingTemplateSchema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const BillingTemplate = model('BillingTemplate', billingTemplateSchema)
