import { ScheduledMassSMS } from '../models/scheduled-mass-sms'

const findScheduledMassSMS = (params, populate) => {
  return ScheduledMassSMS.findOne(params).populate(populate)
}

const findAllScheduledMassSMS = (params, populate = {}, sort = { createdAt: -1 }) => {
  return ScheduledMassSMS.find(params).populate(populate).sort(sort)
}

const createScheduledMassSMS = (data) => {
  return ScheduledMassSMS.create(data)
}

const updateScheduledMassSMS = (search, updateValue) => {
  return ScheduledMassSMS.updateOne(search, updateValue)
}

const deleteScheduledMassSMS = (params) => {
  return ScheduledMassSMS.delete(params)
}

export {
  createScheduledMassSMS,
  findScheduledMassSMS,
  findAllScheduledMassSMS,
  updateScheduledMassSMS,
  deleteScheduledMassSMS
}
