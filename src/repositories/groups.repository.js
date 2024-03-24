import { Groups } from '../models/groups'

const findGroup = (params, populate, sort = {}) => {
  return Groups.findOne(params).populate(populate).sort(sort)
}

const findAllGroups = (params, projection = {}, sort = { createdAt: -1 }) => {
  return Groups.find(params, projection).sort(sort)
}

const createGroup = (data) => {
  return Groups.create(data)
}

const updateGroup = (search, updateValue) => {
  return Groups.updateOne(search, updateValue)
}

const deleteGroup = (params) => {
  return Groups.delete(params)
}

export { findGroup, findAllGroups, createGroup, updateGroup, deleteGroup }
