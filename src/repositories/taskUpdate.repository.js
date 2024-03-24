import { TaskUpdate } from '../models/taskUpdates'

const findTaskUpdates = (params, projection = {}, populate) => {
  return TaskUpdate.findOne(params, projection).populate(populate)
}

const findAllTaskUpdates = (params, projection = {}, populate = [], sort = { createdAt: 1 }) => {
  return TaskUpdate.find(params, projection).sort(sort).populate(populate)
}

const createTaskUpdates = (data) => {
  return TaskUpdate.create(data)
}

const findLatestUpdate = (params, projection = {}, populate) => {
  return TaskUpdate.findOne(params, projection).populate(populate).sort({ createdAt: -1 })
}

const updateTaskUpdates = (search, updateValue, populate = []) => {
  return TaskUpdate.updateOne(search, updateValue).populate(populate)
}

const deleteTaskUpdates = (status) => {
  return TaskUpdate.delete(status)
}

const deleteManyTaskUpdates = (updates) => {
  return TaskUpdate.delete(updates)
}

export {
  createTaskUpdates,
  findTaskUpdates,
  findAllTaskUpdates,
  updateTaskUpdates,
  deleteTaskUpdates,
  deleteManyTaskUpdates,
  findLatestUpdate
}
