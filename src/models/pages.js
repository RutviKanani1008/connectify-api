import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    pageName: {
      type: String,
      required: true
    },
    pageId: {
      type: String,
      required: true
    },
    parentPage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pages',
      default: null
    },
    allow_guide: {
      type: Boolean,
      default: false
    },
    allowCms: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Pages = model('Pages', schema)
