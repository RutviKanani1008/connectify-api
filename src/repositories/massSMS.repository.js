import { MassSMS } from '../models/mass-sms'

const findMassSMS = (params, populate) => {
  return MassSMS.findOne(params).populate(populate)
}

const findAllMassSMS = (params) => {
  return MassSMS.find(params).sort({ createdAt: -1 })
}

const createMassSMS = (data) => {
  return MassSMS.create(data)
}

const updateMassSMS = (search, updateValue) => {
  return MassSMS.updateOne(search, updateValue)
}

const deleteMassSMS = (params) => {
  return MassSMS.delete(params)
}

export { createMassSMS, findMassSMS, findAllMassSMS, updateMassSMS, deleteMassSMS }
