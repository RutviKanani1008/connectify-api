import { TaskNotifyUser } from '../models/taskNotifyUser'

export const createTaskNotifyUser = (data) => TaskNotifyUser.create(data)

export const createManyTaskNotifyUser = (data) => TaskNotifyUser.insertMany(data)

export const findTaskNotifyUser = (data, projection = {}, populate = []) =>
  TaskNotifyUser.findOne(data, projection).populate(populate)

export const findTaskNotifyUsers = (data, projection = {}, populate = []) =>
  TaskNotifyUser.find(data, projection).populate(populate)

export const removeTaskNotifyUser = (data) => TaskNotifyUser.delete(data)

export const removeTaskNotifyUsers = (data) => TaskNotifyUser.delete(data)
