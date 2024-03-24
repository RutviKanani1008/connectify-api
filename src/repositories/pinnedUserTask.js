import { PinnedUserTask } from '../models/pinnedUserTask'

const findPinnedUserTask = (params, populate) => {
  return PinnedUserTask.findOne(params).populate(populate)
}

const findAllPinnedUserTask = (params, populate) => {
  return PinnedUserTask.find(params).sort({ createdAt: -1 }).populate(populate)
}

const createPinnedUserTask = (data) => {
  return PinnedUserTask.create(data)
}

const deletePinnedUserTask = (params) => {
  return PinnedUserTask.deleteOne(params)
}

const deleteMuliplePinnedUserTask = (params) => {
  return PinnedUserTask.deleteMany(params)
}

export {
  createPinnedUserTask,
  findPinnedUserTask,
  findAllPinnedUserTask,
  deletePinnedUserTask,
  deleteMuliplePinnedUserTask
}
