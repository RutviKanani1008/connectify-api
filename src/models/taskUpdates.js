import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    content: { type: String },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Tasks' },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Companies', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', default: null },
    uploadAttachments: {
      type: [
        {
          fileName: { type: String, default: '' },
          fileUrl: { type: String, default: '' }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const TaskUpdate = model('TaskUpdate', schema)
