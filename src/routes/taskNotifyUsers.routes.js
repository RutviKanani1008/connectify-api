import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import * as taskNotifyUsersController from '../controllers/taskNotifyUsers.controller'

const taskNofiyUsers = Router()

taskNofiyUsers.get('/task-notify-users', authenticated, taskNotifyUsersController.getTaskNotifyUsers)

taskNofiyUsers.post('/task-notify-users', authenticated, taskNotifyUsersController.addTaskNotifyUsers)

taskNofiyUsers.post('/task-notify-users/checkUnread', authenticated, taskNotifyUsersController.getUnreadStatus)

taskNofiyUsers.get('/task-notify-users/:userId', authenticated, taskNotifyUsersController.getUsersUnreadTasks)

taskNofiyUsers.post('/task-notify-users/:userId', authenticated, taskNotifyUsersController.deleteUsersUnreadTasks)

export default taskNofiyUsers
