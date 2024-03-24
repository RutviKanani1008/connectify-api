import bcryptjs from 'bcryptjs'
import generalResponse from '../helpers/generalResponse.helper'
import { generateRandomString } from '../helpers/generateRandomString'
import {
  createUser,
  deleteUser,
  findAllUser,
  findUser,
  findUserUsingAggregate,
  findUserWithAggregation,
  findUserWithAggregationCount,
  updateUser
} from '../repositories/users.repository'
import { findOneCompany } from '../repositories/companies.repository'
import { sendMail } from '../services/send-grid'
import { findOneEmailTemplate } from '../repositories/emailTemplates.repository'
import { INTERNAL_COMMUNICATION_TEMPLATE } from '../constants/internalCommunicationTemplate'
import { varSetInTemplate } from '../helpers/dynamicVarSetInTemplate.helper'
import { getSelectParams } from '../helpers/generalHelper'
import { ObjectId } from 'mongodb'
import { parseData } from '../utils/utils'
import { sendNotificationJob } from '../schedular-jobs/notification'
import { NOTIFICATION_MODULE_TYPE, USER_NOTIFICATION_ACTION } from '../services/notification/constants'

const { hash } = bcryptjs

export const createNewUser = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { email, company } = req.body

    if (!email) {
      return generalResponse(res, false, { text: 'Email is required.' }, 'error', false, 400)
    }

    const isExist = await findUser({ email, company })
    if (isExist) {
      return generalResponse(res, null, { text: 'User already exists.' }, 'error', true, 400)
    }

    const authCode = generateRandomString(10)
    const password = await hash(generateRandomString(10), 15)

    const user = await createUser({
      firstName: req.body.firstName ?? null,
      lastName: req.body.lastName ?? null,
      email,
      password,
      phone: req.body.phone ?? null,
      address1: req.body.address1 ?? null,
      address2: req.body.address2 ?? null,
      city: req.body.city ?? null,
      state: req.body.state ?? null,
      country: req.body.country ?? null,
      zip: req.body.zip ?? null,
      notes: req.body.notes || [],
      authCode,
      company: req.body.company,
      role: req.body.role || 'user',
      inventoryRole: req.body.inventoryRole || 'inputUser',
      isVerified: true,
      userProfile: req.body.userProfile,
      permissions: req.body.permissions || [],
      taskManagerUsers: req.body.taskManagerUsers
    })

    const companyDetails = await findOneCompany({ _id: req.body.company }).select({ name: 1 })

    const template = await findOneEmailTemplate({
      _id: INTERNAL_COMMUNICATION_TEMPLATE.userLoginSetPassword
    }).select({ htmlBody: true, subject: true })

    let userLoginTemplateBody = template.htmlBody

    const setUserLoginVarObj = {
      name: req.body?.firstName || req.body?.lastName ? `${req.body?.firstName ?? ''} ${req.body?.lastName ?? ''}` : '',
      companyName: `${companyDetails?.name}`,
      link: `${process.env.HOST_NAME}/set-password?code=${authCode}`
    }
    userLoginTemplateBody = varSetInTemplate(setUserLoginVarObj, userLoginTemplateBody)
    sendMail({ receiver: email, subject: 'Account created by admin', htmlBody: userLoginTemplateBody })

    // Send Notification
    await sendNotificationJob({
      module: NOTIFICATION_MODULE_TYPE.USER,
      data: {
        userName: [req.body.firstName || '', req.body.lastName || ''].join(' ').trim() || email,
        userId: user._id,
        companyId: currentUser.company,
        action: USER_NOTIFICATION_ACTION.CREATE,
        createdBy: currentUser._id
      }
    })

    return generalResponse(
      res,
      { _id: user?._id },
      'User is created successfully and email is sent for setting the password',
      'success',
      true
    )
  } catch (error) {
    console.log('Error:createNewUser', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const createUserNote = async (req, res) => {
  try {
    const { id } = req.params
    const { text } = req.body
    const currentUser = req.headers.authorization

    if (!text) return generalResponse(res, null, { text: 'Text required.' }, 'error')

    const user = await findUser({ _id: id })
    if (!user) return generalResponse(res, null, { text: 'User Not Found.' }, 'error')

    const userNotes = user.notes || []
    userNotes.push({ text, updatedBy: currentUser })

    await updateUser({ _id: id }, { notes: userNotes })

    const { notes } = await findUserUsingAggregate({ _id: id }, [], { notes: 1 })

    generalResponse(res, notes, 'User Note added successfully.', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getUsers = async (req, res) => {
  try {
    const users = await findAllUser({}, getSelectParams(req))
    return generalResponse(res, users, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getAllCompanyUsers = async (req, res) => {
  try {
    const { companyId } = req.params

    if (!companyId) {
      return generalResponse(res, false, { text: 'CompanyId is required.' }, 'error', false, 400)
    }

    const users = await findAllUser({ ...req.query, company: companyId, active: true }, getSelectParams(req))
    return generalResponse(res, users, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getCompanyUsers = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { companyId } = req.params
    let { limit = 5, page = 1, search = '', sort } = req.query
    const project = { ...getSelectParams(req) }
    sort = parseData(sort)
    const skip = Number(limit) * Number(page) - Number(limit)

    if (!companyId) {
      return generalResponse(res, false, { text: 'CompanyId is required.' }, 'error', false, 400)
    }

    const $and = [{ company: ObjectId(companyId) }, { _id: { $not: { $eq: ObjectId(currentUser._id) } } }]
    if (search) {
      const reg = new RegExp(search, 'i')
      $and.push({
        $or: [
          { firstName: { $regex: reg } },
          { lastName: { $regex: reg } },
          { email: { $regex: reg } },
          { address1: { $regex: reg } },
          { address2: { $regex: reg } },
          { phone: { $regex: reg } }
        ]
      })
    }

    const match = { ...($and.length ? { $and } : {}) }

    const totalUsers = await findUserWithAggregationCount({
      match
    })

    const users = await findUserWithAggregation({ match, skip, limit: Number(limit), sort, project })
    return generalResponse(res, { results: users, pagination: { total: totalUsers?.[0]?.count || 0 } }, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getUser = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return generalResponse(res, null, { text: 'Id is required.' }, 'error')

    const user = await findUser({ _id: id }, {}, [{ path: 'notes.updatedBy', ref: 'Users' }])

    return generalResponse(res, user, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getUserNotes = async (req, res) => {
  try {
    const { id } = req.params

    const user = await findUserUsingAggregate({ _id: id }, [{ path: 'notes.updatedBy', ref: 'Users' }], { notes: 1 })
    if (!user) return generalResponse(res, null, { text: 'User Not Found.' }, 'error')

    const userNotes = user.notes

    return generalResponse(res, userNotes, 'User Notes fetched successfully....', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateUserById = async (req, res) => {
  try {
    const { id } = req.params
    const { email } = req.body
    const currentUser = req.headers.authorization

    const isExist = await findUser({ email, company: currentUser.company, _id: { $ne: id } }).select({
      _id: 1
    })
    if (isExist) {
      return generalResponse(res, false, { text: 'User already exist.' }, 'error', false, 400)
    }

    const updatedUser = {
      firstName: req.body.firstName ?? null,
      lastName: req.body.lastName ?? null,
      email,
      phone: req.body.phone ?? null,
      address1: req.body.address1 ?? null,
      address2: req.body.address2 ?? null,
      city: req.body.city ?? null,
      state: req.body.state ?? null,
      country: req.body.country ?? null,
      zip: req.body.zip ?? null,
      notes: req.body.notes || [],
      company: req.body.company,
      role: req.body.role || 'user',
      inventoryRole: req.body.inventoryRole || 'inputUser',
      userProfile: req.body.userProfile,
      permissions: req.body.permissions || [],
      taskManagerUsers: req.body.taskManagerUsers
    }

    await updateUser({ _id: req.params.id }, updatedUser)
    return generalResponse(res, null, 'User updated successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateUserPreferences = async (req, res) => {
  try {
    const { id: currentUserId } = req.params
    const { mainSidebarCollapsed, taskManagerSidebarCollapsed } = req.body
    const updatedUser = {
      mainSidebarCollapsed,
      taskManagerSidebarCollapsed
    }
    await updateUser({ _id: currentUserId }, updatedUser)
    return generalResponse(res, null, 'User preferences updated successfully!', 'success', false)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateUserNote = async (req, res) => {
  try {
    const { id, noteId } = req.params
    const { text } = req.body
    const currentUser = req.headers.authorization

    if (!id || !noteId) return generalResponse(res, false, { text: 'id and noteId is required.' }, 'error', false, 400)

    const user = await findUserUsingAggregate({ _id: id }, [], { notes: 1 })
    if (!user) return generalResponse(res, false, { text: 'User not found.' }, 'error', false, 400)

    const { notes } = user
    const currentNoteIndex = notes.findIndex((n) => n._id.toString() === noteId)
    if (currentNoteIndex === -1) return generalResponse(res, false, { text: 'Note not exist.' }, 'error', false, 400)

    notes[currentNoteIndex] = { ...notes[currentNoteIndex], text, updatedBy: currentUser, updatedAt: new Date() }

    await updateUser({ _id: id }, { notes })

    generalResponse(res, notes, 'User Note updated successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateUserDetail = async (req, res) => {
  try {
    const { id } = req.params

    const user = await findUserUsingAggregate({ _id: id }, [], { _id: 1 })
    if (!user) return generalResponse(res, false, { text: 'User not found.' }, 'error', false, 400)

    await updateUser({ _id: id }, { ...req.body })

    generalResponse(res, null, 'User updated successfully!', 'success', true)
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params

    const user = await findUser({ _id: id })
    if (!user) {
      return generalResponse(res, false, { text: 'User not found.' }, 'error', false, 400)
    }
    await deleteUser({ _id: ObjectId(req.params.id) })

    return generalResponse(res, null, 'User deleted successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteUserNoteById = async (req, res) => {
  try {
    const { id, noteId } = req.params

    if (!id || !noteId) return generalResponse(res, false, { text: 'id and noteId is required.' }, 'error', false, 400)

    const user = await findUserUsingAggregate({ _id: id }, [], { notes: 1 })
    if (!user) return generalResponse(res, false, { text: 'User note found.' }, 'error', false, 400)

    let { notes } = user
    const currentNoteIndex = notes.findIndex((n) => n._id.toString() === noteId)
    if (currentNoteIndex === -1) return generalResponse(res, false, { text: 'Note not exist.' }, 'error', false, 400)
    notes = notes.filter((_, idx) => idx !== currentNoteIndex)

    await updateUser({ _id: id }, { notes })

    generalResponse(res, notes, 'User Note deleted successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
