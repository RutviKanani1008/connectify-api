import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    label: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    markAsCompleted: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['status', 'priority', 'category', 'label'],
      required: true
    },
    helperText: {
      type: String,
      default: null
    },
    color: {
      type: String,
      required: false,
      default: null
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
    },
    active: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const TaskOption = model('TaskOption', schema)
