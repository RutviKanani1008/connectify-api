import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    data: {
      type: Object,
      required: true
    },
    productErrors: {
      type: {
        isTitleNotExists: { type: Boolean, default: false },
        isQuantityNotExists: { type: Boolean, default: false },
        isQuantityNotNumber: { type: Boolean, default: false },
        isSku: { type: Boolean, default: false }
      },
      default: null
    },
    importedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Import-Products-Job'
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const ImportedProducts = model('Import-Products', schema)
