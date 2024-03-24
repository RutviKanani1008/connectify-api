import { TaskOption } from '../models/taskOptions'

const findTaskOption = (params) => {
  return TaskOption.findOne(params)
}

const findAllTaskOption = (params) => {
  return TaskOption.find(params).sort({ order: 1, createdAt: -1 })
}

const createTaskOption = (data) => {
  return TaskOption.create(data)
}

const updateTaskOption = (search, updateValue) => {
  return TaskOption.updateOne(search, updateValue)
}

const updateMultipleTaskOption = (search, updateValue) => {
  return TaskOption.updateMany(search, updateValue)
}

const deleteTaskOption = (status) => {
  return TaskOption.delete(status)
}

export const taskOptionBulkWrite = (orderObjArray) => {
  return TaskOption.bulkWrite(orderObjArray)
}

export { createTaskOption, findTaskOption, findAllTaskOption, updateTaskOption, deleteTaskOption, updateMultipleTaskOption }
