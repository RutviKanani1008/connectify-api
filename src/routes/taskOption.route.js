import { Router } from 'express'
import {
  addTaskOptionDetail,
  cloneTaskDetails,
  deleteTaskOptionDetail,
  getTaskOptionDetails,
  reOrderTaskOption,
  updateTaskOptionDetail
} from '../controllers/taskOption.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const taskOption = Router()

taskOption.get('/task-option', authenticated, getTaskOptionDetails)

taskOption.post('/task-option', authenticated, addTaskOptionDetail)
taskOption.post('/task-option-reorder', authenticated, reOrderTaskOption)

taskOption.put('/task-option/:id', authenticated, updateTaskOptionDetail)

taskOption.post('/delete-task-option/:id', authenticated, deleteTaskOptionDetail)

taskOption.get('/clone-task-option', cloneTaskDetails)

export default taskOption
