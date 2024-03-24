import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    tagId: {
      type: String,
      required: true
    },
    tagName: {
      type: String,
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Groups',
      default: null
    },
    position: {
      type: Number,
      required: true,
      default: 0
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
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
export const Tags = model('Tags', schema)
