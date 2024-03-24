import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  deleteUserNotifications,
  getUserNotificationCount,
  getUserNotifications,
  updateUserNotificationsReadStatus
} from '../controllers/notification.controller'

const notification = Router()

notification.get('/user-notifications', authenticated, getUserNotifications)

notification.get('/user-notifications-count', authenticated, getUserNotificationCount)

notification.delete('/delete-user-notifications/:id', authenticated, deleteUserNotifications)

notification.put('/update-user-notifications-read-status', authenticated, updateUserNotificationsReadStatus)

export default notification
