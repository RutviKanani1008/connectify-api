import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const afterTaskInstructionTemplate = new Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Companies', required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    templateBody: { type: String, required: true }
  },
  { timestamps: true }
)

afterTaskInstructionTemplate.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const AfterTaskInstructionTemplate = model('AfterTaskInstructionTemplate', afterTaskInstructionTemplate)
