import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    fieldId: {
      type: String,
      required: true
    },
    fieldName: {
      type: String,
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    position: {
      type: Number,
      required: true,
      default: 0
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Groups',
      default: null
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const CustomField = model('Custom-field', schema)
