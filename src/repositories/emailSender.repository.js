import { EmailSender } from '../models/emailSender'

export const addEmailSenderService = (data) => {
  return EmailSender.create(data)
}

export const updateEmailSenderService = (search, updateValue) => {
  return EmailSender.updateOne(search, updateValue)
}

export const findEmailSenderService = (params, projection = {}, populate = []) => {
  return EmailSender.find(params, projection).sort({ createdAt: -1 }).populate(populate)
}

export const findOneEmailSenderService = (params, projection = {}, populate = []) => {
  return EmailSender.findOne(params, projection).sort({ createdAt: -1 }).populate(populate)
}

export const deleteEmailSender = (params) => {
  return EmailSender.delete(params)
}
