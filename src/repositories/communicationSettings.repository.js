import { CommunicationSettings } from '../models/communicationSettings'

export const findCommunicationSettingRepo = (params, projection = {}, populate = []) => {
  return CommunicationSettings.findOne(params, projection).populate(populate)
}

export const createOrUpdateCommunicationSettingRepo = (search, updateValue) => {
  return CommunicationSettings.updateOne(search, updateValue, { upsert: true })
}
