import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    folderId: {
      type: String,
      required: true
    },
    folderName: {
      type: String,
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    folderFor: {
      type: String,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    },
    model: {
      type: String,
      default: null
    },
    modelRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    order: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Folders = model('Folder', schema)
