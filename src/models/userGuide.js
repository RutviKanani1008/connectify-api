import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pages',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    imageAttchments: {
      type: [
        {
          fileName: { type: String, default: '' },
          fileUrl: { type: String, default: '' }
        }
      ],
      default: []
    },
    videoAttchments: {
      type: [
        {
          fileName: { type: String, default: '' },
          fileUrl: { type: String, default: '' }
        }
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const UserGuide = model('UserGuide', schema)
