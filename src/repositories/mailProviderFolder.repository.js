import { MailProviderFolder } from '../models/mailProviderFolder'

export const getProviderFolder = (params, projection = {}, populate = []) => {
  return MailProviderFolder.findOne(params, projection).populate(populate)
}

export const findAndUpdateMailProviderFolder = (search, updateValue) => {
  return MailProviderFolder.findOneAndUpdate(search, updateValue, { upsert: true })
}

export const deleteMailProviderFolderRepo = (params) => {
  return MailProviderFolder.delete(params)
}
