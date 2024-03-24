import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    reportProblemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report-problem'
    },
    featureRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Feature-request'
    },
    modelName: {
      type: String,
      enum: ['Report-problem', 'Feature-request'],
      default: 'Report-problem'
    },
    message: {
      type: String,
      required: true
    },
    commentedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    }
  },
  { timestamps: true }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const ReportFeatureComments = model('ReportProblemComment', schema)
