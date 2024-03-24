import generalResponse from '../helpers/generalResponse.helper'
import { jwthelper } from '../helpers/jwt.helper'
import { Users } from '../models/users'
import { findOneCompany } from '../repositories/companies.repository'
import { deleteUserSession, getUserSession } from '../repositories/userSession.repository'

export const authenticated = async (req, res, next) => {
  const token = req.headers.authorization

  if (!token) {
    return res.status(401).send('Unauthorized')
  }
  const user = await jwthelper.decode('Bearer ' + token)

  if (!user) {
    await deleteUserSession({ deviceId: user?.deviceId })
    return res.status(401).send('Unauthorized')
  }

  const userSessionData = await getUserSession({
    deviceId: user?.deviceId,
    expireTime: { $gt: new Date() }
  }).select({ _id: 1 })

  if (!userSessionData) {
    await deleteUserSession({ deviceId: user?.deviceId })
    return res.status(401).send('Unauthorized')
  }

  const userData = await Users.findById(user.id, {
    password: 0,
    authCode: 0,
    tags: 0,
    category: 0
  }).populate({
    path: 'contactId',
    ref: 'Contacts',
    select: { permissions: 1 }
  })

  const company = await findOneCompany({ _id: userData?.company }, { archived: 1 }).select({
    _id: 1,
    archived: 1
  })

  if (company.archived) {
    return generalResponse(res, '', { text: 'Your company is not active!' }, 'error', false, 400)
  }

  const tempUserData = userData?.toObject()

  // Append deviceId
  tempUserData.deviceId = user?.deviceId

  req.headers.authorization = tempUserData

  next()
}

export const authQueue = async (req, res, next) => {
  try {
    const { user, pass } = JSON.parse(Buffer.from(req.headers.authorization, 'base64').toString('utf-8')) || {}

    if (user === 'queue' && pass === 'Admin@123') {
      return next()
    }
    return res.status(401).send('Unauthorized')
  } catch (err) {
    console.log({ err })
    next(err)
  }
}
