import { ScheduledMassEmail } from '../models/scheduled-mass-email'
import { ObjectId } from 'mongodb'

export const findScheduledMassEmail = (params, populate, projection = {}) => {
  console.log({ params })

  return ScheduledMassEmail.findOne(params, projection).populate(populate)
}

export const findScheduledMassEmailContactLength = (id) => {
  return ScheduledMassEmail.aggregate([
    {
      $match: { _id: ObjectId(id) }
    },
    { $project: { count: { $size: '$contacts' } } }
  ])
}

export const findAllScheduledMassEmail = (
  params,
  populate = {},
  sort = { createdAt: -1 },
  skip = 0,
  limit = 100000
) => {
  console.log({ params, skip, limit })
  return ScheduledMassEmail.find(params).populate(populate).sort(sort).skip(skip).limit(limit)
}

export const createScheduledMassEmail = (data) => {
  return ScheduledMassEmail.create(data)
}

export const updateScheduledMassEmail = (search, updateValue) => {
  return ScheduledMassEmail.updateOne(search, updateValue, { new: true })
}

export const deleteScheduledMassEmail = (params) => {
  return ScheduledMassEmail.delete(params)
}

export const countTotalScheduleMassEmail = (params) => {
  return ScheduledMassEmail.count(params)
}
