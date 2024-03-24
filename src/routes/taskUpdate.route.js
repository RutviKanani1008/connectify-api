import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import * as taskUpdateController from '../controllers/taskUpdate.controller'

const taskUpdates = Router()

taskUpdates.get('/task-update', authenticated, taskUpdateController.getAllTaskUpdates)

taskUpdates.get('/task-update/:id', authenticated, taskUpdateController.getTaskUpdate)

taskUpdates.post('/task-update', authenticated, taskUpdateController.addTaskNewUpdate)

taskUpdates.put('/task-update/:id', authenticated, taskUpdateController.editTaskUpdateDetail)

taskUpdates.delete('/task-update/:id', authenticated, taskUpdateController.deleteTaskUpdateDetail)

export default taskUpdates
