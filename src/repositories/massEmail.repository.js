import { MassEmail } from '../models/mass-email'
import { ObjectId } from 'mongodb'

const findMassEmail = (params, projection = {}, populate) => {
  return MassEmail.findOne(params, projection).populate(populate)
}

const findAllMassEmail = (params, project, skip = 0, limit = 100000) => {
  const { company, saveAs = false, ...rest } = params

  return MassEmail.aggregate([
    {
      $match: {
        company: ObjectId(company),
        saveAs: Boolean(saveAs),
        ...rest
      }
    },
    { $project: project },
    { $addFields: { contacts: { $size: '$contacts' } } },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ])
}

const createMassEmail = (data) => {
  return MassEmail.create(data)
}

const findTotalMassMailCount = (data) => {
  return MassEmail.count(data)
}

const updateMassEmail = (search, updateValue) => {
  return MassEmail.updateOne(search, updateValue)
}

const deleteMassEmail = (params) => {
  return MassEmail.delete(params)
}

export { createMassEmail, findMassEmail, findAllMassEmail, updateMassEmail, deleteMassEmail, findTotalMassMailCount }
