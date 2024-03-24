import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notifications',
      required: true
    },
    status: {
      type: String,
      default: 'UNREAD',
      enum: ['READ', 'UNREAD']
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const NotificationUser = model('NotificationUsers', schema)
