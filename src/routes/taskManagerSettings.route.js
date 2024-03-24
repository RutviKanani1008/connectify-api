import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import { createOrUpdateTaskManagerSetting, getTaskManagerSetting } from '../controllers/taskManagerSettings.controller'

const TaskManagerSettings = Router()

TaskManagerSettings.get('/tasks-settings', authenticated, getTaskManagerSetting)
TaskManagerSettings.post('/tasks-settings', authenticated, createOrUpdateTaskManagerSetting)

export default TaskManagerSettings
