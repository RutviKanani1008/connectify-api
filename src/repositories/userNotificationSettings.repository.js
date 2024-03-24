import { UserNotificationSettings } from '../models/user-notification-settings'

const findUserNotificationSettings = (params, sort = {}) => {
  return UserNotificationSettings.findOne(params).sort(sort)
}

const findAllUserNotificationSettings = (params, sort = { position: 1 }) => {
  return UserNotificationSettings.find(params).sort(sort)
}

const createUserNotificationSettings = (data) => {
  return UserNotificationSettings.create(data)
}

const updateUserNotificationSettings = (search, updateValue) => {
  return UserNotificationSettings.updateOne(search, updateValue)
}

const deleteUserNotificationSettings = (params) => {
  return UserNotificationSettings.delete(params)
}

export {
  createUserNotificationSettings,
  findUserNotificationSettings,
  findAllUserNotificationSettings,
  updateUserNotificationSettings,
  deleteUserNotificationSettings
}
