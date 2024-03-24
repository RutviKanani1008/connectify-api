import { UserGuide } from '../models/userGuide'

const findUserGuide = (params, populate) => {
  return UserGuide.findOne(params).populate(populate)
}

const findAllUserGuide = (params, populate) => {
  return UserGuide.find(params).populate(populate).sort({ createdAt: -1 })
}

const createUserGuide = (data) => {
  return UserGuide.create(data)
}

const updateUserGuide = (search, updateValue) => {
  return UserGuide.updateOne(search, updateValue)
}

const deleteUserGuide = (userGuide) => {
  return UserGuide.delete(userGuide)
}

export { createUserGuide, findUserGuide, findAllUserGuide, updateUserGuide, deleteUserGuide }
