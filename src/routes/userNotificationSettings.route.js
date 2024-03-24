import { Router } from 'express'
import {
  getUserNotificationSettingsDetails,
  updateUserNotificationDetails
} from '../controllers/userNotificationSettings.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const userNotificationSettings = Router()

userNotificationSettings.get('/user-notification-setting/:id', authenticated, getUserNotificationSettingsDetails)

userNotificationSettings.put('/user-notification-setting/:id', authenticated, updateUserNotificationDetails)

export default userNotificationSettings
