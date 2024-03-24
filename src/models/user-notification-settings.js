import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

export const AVAILABLE_NOTIFICATION_TYPE = {
  email: 'email',
  platForm: 'platForm'
}
const schema = new Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Companies', default: null },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    notifications: {
      type: [
        {
          notificationDetail: {
            type: 'String', // allTaskNotifications
            default: null
          },
          eventModule: {
            type: 'String', // task, contacts
            default: null
          },
          notificationType: {
            type: ['String'],
            default: [...Object.keys(AVAILABLE_NOTIFICATION_TYPE)],
            enum: [...Object.keys(AVAILABLE_NOTIFICATION_TYPE)]
          }
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
export const UserNotificationSettings = model('User-Notification-Settings', schema)
