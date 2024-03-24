import { UserSession } from '../models/userSession'

export const addUserSession = (data) => {
  return UserSession.create(data)
}

export const getUserSessions = (params, projection = {}, populate = [], sort = { createdAt: -1 }) => {
  return UserSession.find(params, projection).sort(sort).populate(populate)
}

export const getUserSession = (params, projection = {}) => {
  return UserSession.findOne(params, projection)
}

export const deleteUserSession = (params) => {
  return UserSession.delete(params)
}
