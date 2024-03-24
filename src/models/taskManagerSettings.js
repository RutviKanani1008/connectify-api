import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true
    },
    alertOnTaskComplete: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const TaskManagerSettings = model('Task-Manager-Settings', schema)
