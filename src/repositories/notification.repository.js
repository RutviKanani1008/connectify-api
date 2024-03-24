import { Notification } from '../models/notification'
import { NotificationUser } from '../models/notificationUser'

// ** Notification **
export const createNotification = (data) => {
  return Notification.create(data)
}

export const deleteUserNotification = (params) => {
  return NotificationUser.delete(params)
}

export const updateUserNotificationRepo = (search, updateValue) => {
  return NotificationUser.update(search, updateValue)
}

export const userNotificationBulkWrite = (orderObjArray) => {
  return NotificationUser.bulkWrite(orderObjArray)
}

export const getUserNotificationCountRepo = (query) => {
  return NotificationUser.count(query)
}

// ** Notification User **
export const findUserNotifications = ({
  where = {},
  projection = {},
  paginationConf = { skip: 0, limit: 10 },
  populate = [],
  sort = { createdAt: -1 }
}) => {
  return NotificationUser.find(where, projection, paginationConf).sort(sort).populate(populate)
}
