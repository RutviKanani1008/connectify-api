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
    endpoint: {
      type: String
    },
    expirationTime: {
      type: String
    },
    keys: {
      type: {
        p256dh: { type: String },
        auth: { type: String }
      }
    },
    deviceId: {
      type: String
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const WebPushSubscription = model('WebPushSubscription', schema)
