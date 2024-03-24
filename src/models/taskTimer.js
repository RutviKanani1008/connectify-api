import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Tasks'
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    startedAt: {
      type: Number,
      default: null
    },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    endedAt: {
      type: Number,
      default: null
    },
    endedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    pauses: {
      type: [
        {
          pausedAt: {
            type: Number,
            default: null
          },
          pausedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', default: null },
          resumedAt: { type: Number, default: null },
          resumedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', default: null },
          totalPausedTime: { type: Number, default: null }
        }
      ],
      default: []
    },
    totalTime: { type: Number, default: null },
    note: { type: String, default: null },
    currentStatus: { type: String, default: null }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const TaskTimer = model('Task-timer', schema)
