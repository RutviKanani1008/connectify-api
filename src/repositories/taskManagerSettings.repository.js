import { TaskManagerSettings } from '../models/taskManagerSettings'

export const findTaskManagerSettingRepo = (params, projection = {}, populate = []) => {
  return TaskManagerSettings.findOne(params, projection).populate(populate)
}

export const createOrUpdateTaskManagerSettingRepo = (search, updateValue) => {
  return TaskManagerSettings.updateOne(search, updateValue, { upsert: true })
}
