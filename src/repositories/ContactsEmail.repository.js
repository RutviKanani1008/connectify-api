import { ContactsEmail } from '../models/contactsEmail'

const findContactsEmail = (params, projection = {}, populate) => {
  return ContactsEmail.find(params, projection).populate(populate).sort({ createdAt: -1 })
}

const findOneContactsEmail = (params, projection = {}, populate) => {
  return ContactsEmail.findOne(params, projection).populate(populate)
}

const createContactsEmail = (data) => {
  return ContactsEmail.create(data)
}

const updateContactsEmail = (search, data) => {
  return ContactsEmail.findByIdAndUpdate(search, data)
}

const deleteContactsEmail = (params) => {
  return ContactsEmail.delete(params)
}

export { findOneContactsEmail, findContactsEmail, createContactsEmail, updateContactsEmail, deleteContactsEmail }
