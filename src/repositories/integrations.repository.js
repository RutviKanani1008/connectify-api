import { Integrations } from '../models/integration'

const findIntegration = (params, populate) => {
  return Integrations.findOne(params).populate(populate)
}

const createIntegration = (data) => {
  return Integrations.create(data)
}

const updateIntegration = (search, updateValue) => {
  return Integrations.updateOne(search, updateValue)
}

const deleteIntegration = (status) => {
  return Integrations.delete(status)
}

export { findIntegration, createIntegration, updateIntegration, deleteIntegration }
