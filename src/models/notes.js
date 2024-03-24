import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    title: {
      type: String,
      default: ''
    },
    note: {
      type: String,
      required: true
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    modelId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    modelName: {
      type: String,
      required: true
    },
    attachments: {
      type: [
        {
          fileName: { type: String, default: null },
          fileUrl: { type: String, default: null }
        }
      ],
      default: []
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    noteNumber: {
      type: String
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users'
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Notes = model('Note', schema)
