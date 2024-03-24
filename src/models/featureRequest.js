import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    id: {
      type: String,
      required: true
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: false
    },
    requestMessage: {
      type: String
    },
    fileUpload: {
      type: String
    },
    status: {
      type: String,
      default: 'Pending',
      enum: ['Pending', 'InProgress', 'Done']
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReportProblemComment'
      }
    ],
    lastReadedCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportProblemComment'
    },
    isNew: {
      type: Boolean,
      default: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      default: null
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
      // required: true
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const FeatureRequest = model('Feature-request', schema)
