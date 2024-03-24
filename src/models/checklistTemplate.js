import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    },
    order: {
      type: Number,
      required: true
    },
    checklist: {
      type: [
        {
          title: { type: String, required: true },
          details: { type: String, required: false },
          checked: { type: Boolean, required: false, default: false },
          sort: { type: Number, required: false }
        }
      ],
      default: []
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const ChecklistTemplates = model('Checklist-Template', schema)
