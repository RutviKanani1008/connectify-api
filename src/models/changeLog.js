import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const changeLogSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true,
      default: new Date()
    },
    features: {
      type: String,
      required: false,
      default: ''
    },
    improvements: {
      type: String,
      required: false,
      default: ''
    },
    bugs: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
)

changeLogSchema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const ChangeLog = mongoose.model('Change-Log', changeLogSchema)
