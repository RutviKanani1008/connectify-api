import { Router } from 'express'
import {
  addBulkTaskWithMultipleContact,
  addTaskDetail,
  cloneTask,
  deleteSnoozedTasks,
  deleteTaskDetail,
  disableTaskWarning,
  getAllTasks,
  getAllTasksList,
  getCalendarTaskList,
  getKanbanTaskList,
  getMultipleParentSubTasks,
  getTaskDetailById,
  getTaskOptionsCount,
  kanbanReOrderTasks,
  pinTask,
  printTaskDeatils,
  reOrderTasks,
  setCompleteStatus,
  setTaskNumber,
  snoozedTasks,
  taskCronJob,
  taskMigrateOrder,
  taskTimerDetails,
  updateTaskDescription,
  updateTaskDetail,
  updateTaskParentDetail
} from '../controllers/task.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const task = Router()

task.get('/tasks', authenticated, getAllTasks)
task.get('/tasks-list', authenticated, getAllTasksList)
task.get('/tasks-calendar-list', authenticated, getCalendarTaskList)
task.get('/tasks-kanban-list', authenticated, getKanbanTaskList)
task.get('/tasks-options-count', authenticated, getTaskOptionsCount)
task.get('/tasks/:id', authenticated, getTaskDetailById)

task.post('/tasks/clone/:id', authenticated, cloneTask)
task.post('/tasks-timer', authenticated, taskTimerDetails)
task.get('/print-task-data', authenticated, printTaskDeatils)

task.post('/tasks/multiple-parent-subtask', authenticated, getMultipleParentSubTasks)
task.post('/tasks', authenticated, addTaskDetail)
task.post('/tasks/pin/:id', authenticated, pinTask)
task.post('/tasks/snooze/:id', authenticated, snoozedTasks)
task.post('/tasks-bulk-with-contact', authenticated, addBulkTaskWithMultipleContact)
task.post('/tasks-reorder', authenticated, reOrderTasks)
task.post('/kanban-tasks-reorder', authenticated, kanbanReOrderTasks)

task.patch('/tasks-warning/:id', authenticated, disableTaskWarning)

task.put('/tasks-parent/:id', authenticated, updateTaskParentDetail)
task.put('/tasks/set-complete-status', authenticated, setCompleteStatus)
task.put('/tasks/set-task-number', setTaskNumber)
task.put('/tasks/:id', authenticated, updateTaskDetail)
task.put('/tasks-autosave/:id', authenticated, updateTaskDescription)
task.put('/tasks-category/:id', authenticated, updateTaskDetail)

task.delete('/tasks/:id', authenticated, deleteTaskDetail)
task.delete('/tasks/snooze/:id', authenticated, deleteSnoozedTasks)

task.get('/test-task-cron', authenticated, taskCronJob)

task.get('/task-order-migrate', authenticated, taskMigrateOrder)

export default task
