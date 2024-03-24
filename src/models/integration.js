import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    sendGrid: {
      type: { apiKey: { type: String } },
      default: null
    },
    twilioKey: {
      type: { accountSid: { type: String }, authToken: { type: String }, notifyServiceSID: { type: String } },
      default: null
    },
    smtpConfig: {
      type: {
        host: { type: String },
        port: { type: Number },
        secured: { type: Boolean },
        username: { type: String },
        password: { type: String }
      },
      default: null
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Integrations = model('Integration', schema)
