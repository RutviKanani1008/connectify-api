import { CustomField } from '../models/customField'

const findCustomField = (params, sort = {}) => {
  return CustomField.findOne(params).sort(sort)
}

const findAllCustomField = (params, sort = { position: 1 }) => {
  return CustomField.find(params).sort(sort)
}

const createCustomField = (data) => {
  return CustomField.create(data)
}

const updateCustomField = (search, updateValue) => {
  return CustomField.updateOne(search, updateValue)
}

const deleteCustomField = (params) => {
  return CustomField.delete(params)
}

export { createCustomField, findCustomField, findAllCustomField, updateCustomField, deleteCustomField }
