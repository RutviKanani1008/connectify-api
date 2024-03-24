import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    pipelineName: {
      type: String,
      required: true
    },
    pipelineCode: {
      type: String,
      required: true
    },
    stages: {
      type: [{ code: { type: String }, title: { type: String }, order: { type: Number } }],
      default: []
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Groups',
      default: null
    },
    active: {
      type: Boolean,
      default: true
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
export const Pipeline = model('Pipeline', schema)
