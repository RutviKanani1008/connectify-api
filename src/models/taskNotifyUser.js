import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

export const notificationForType = {
  NEW_TASK: 'new-task',
  NEW_UPDATE: 'new-update'
}

const schema = new Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Tasks', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Companies' },
  notificationFor: {
    type: String,
    enum: ['new-task', 'new-update'],
    default: notificationForType.NEW_TASK
  }
})

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const TaskNotifyUser = model('TaskNotifyUsers', schema)
