import { Status } from '../models/status'

const findStatus = (params, sort = {}) => {
  return Status.findOne(params).sort(sort)
}

const findAllStatus = (params, sort = { position: 1 }) => {
  return Status.find(params).sort(sort)
}

const createStatus = (data) => {
  return Status.create(data)
}

const updateStatus = (search, updateValue) => {
  return Status.updateOne(search, updateValue)
}

const deleteStatus = (status) => {
  return Status.delete(status)
}

export { createStatus, findStatus, findAllStatus, updateStatus, deleteStatus }
