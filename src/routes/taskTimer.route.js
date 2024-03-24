import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  createTaskTimerDetails,
  createTaskTimerHistory,
  deleteTaskTimerDetails,
  getAllTimerDetails,
  getExportTaskTimerDetails,
  getLatestTaskTimerDetails,
  getTaskTimerReportDetail,
  getTaskTimerDetails,
  updateTaskTimerDetails,
  updateTaskTimerHistory
} from '../controllers/taskTimer.controller'

const taskTimer = Router()

taskTimer.get('/task-timer', authenticated, getTaskTimerDetails)

taskTimer.get('/task-timer-latest', authenticated, getLatestTaskTimerDetails)

taskTimer.get('/export-task-timer-data', authenticated, getExportTaskTimerDetails)

taskTimer.get('/task-timer-details', authenticated, getAllTimerDetails)

taskTimer.post('/task-timer', authenticated, createTaskTimerDetails)

taskTimer.post('/task-timer-report', authenticated, getTaskTimerReportDetail)

taskTimer.put('/task-timer/:id', authenticated, updateTaskTimerDetails)

taskTimer.delete('/task-timer/:id', authenticated, deleteTaskTimerDetails)

/* Timer History */

taskTimer.post('/task-timer-history', authenticated, createTaskTimerHistory)
taskTimer.put('/task-timer-history/:id', authenticated, updateTaskTimerHistory)

export default taskTimer
