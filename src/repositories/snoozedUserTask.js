import { SnoozedUserTask } from '../models/snoozeUserTask'

const findSnoozedUserTask = (params, populate) => {
  return SnoozedUserTask.findOne(params).populate(populate)
}

const findAllSnoozedUserTask = (params, populate) => {
  return SnoozedUserTask.find(params).sort({ createdAt: -1 }).populate(populate)
}

const createSnoozedUserTask = (data) => {
  return SnoozedUserTask.create(data)
}

const createBulkTaskSnooze = (data) => {
  return SnoozedUserTask.insertMany(data)
}

const deleteSnoozedUserTask = (params) => {
  return SnoozedUserTask.deleteOne(params)
}

const deleteManySnoozedUserTask = (params) => {
  return SnoozedUserTask.deleteMany(params)
}

export {
  createSnoozedUserTask,
  findSnoozedUserTask,
  findAllSnoozedUserTask,
  deleteSnoozedUserTask,
  createBulkTaskSnooze,
  deleteManySnoozedUserTask
}
