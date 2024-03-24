import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose
const schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tasks',
      required: true
    },
    pinned: {
      type: Number,
      default: 0
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const PinnedUserTask = model('PinnedUserTask', schema)
