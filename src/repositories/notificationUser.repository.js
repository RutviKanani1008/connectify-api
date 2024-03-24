import { NotificationUser } from '../models/notificationUser'

export const createNotificationUsers = (data) => {
  return NotificationUser.bulkWrite(data)
}
