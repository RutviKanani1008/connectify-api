import { ObjectId } from 'mongodb'
import _ from 'lodash'
import generalResponse from '../helpers/generalResponse.helper'
import { notificationForType } from '../models/taskNotifyUser'
import {
  createManyTaskNotifyUser,
  findTaskNotifyUsers,
  removeTaskNotifyUsers,
  findTaskNotifyUser
} from '../repositories/taskNotifyUsers.repository'
import { customParse, getSelectParams } from '../helpers/generalHelper'

export const addTaskNotifyUsers = async (req, res) => {
  try {
    const company = ObjectId(req?.headers?.authorization?.company)
    const { taskId: task, userIds = [], notificationFor = notificationForType.NEW_TASK } = req.body

    if (!task) {
      return generalResponse(res, false, { text: 'TaskID  required.' }, 'error', false, 400)
    }

    if (!_.isArray(userIds) || !userIds.length) {
      return generalResponse(res, false, { text: 'UserID required.' }, 'error', false, 400)
    }

    let unreadUserIds = [...userIds]
    if (notificationFor === notificationForType.NEW_UPDATE) {
      const notifyUsers = await findTaskNotifyUsers({ task, user: userIds, notificationFor })
      unreadUserIds = unreadUserIds.filter((id) => !notifyUsers.map((u) => u.user.toString()).includes(id))
    }

    const newUsers = unreadUserIds.map((user) => ({ task, user, notificationFor, company }))

    const newItems = await createManyTaskNotifyUser(newUsers)
    return generalResponse(res, newItems, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 500)
  }
}

export const getTaskNotifyUsers = async (req, res) => {
  try {
    const { taskId: task } = req.params

    const projection = getSelectParams(req)
    const populate = customParse(req.query.populate || [])

    const { notificationFor = notificationForType.NEW_TASK } = req.query

    const users = await findTaskNotifyUsers({ task, notificationFor }, projection, populate)

    return generalResponse(res, users, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 500)
  }
}

export const getUsersUnreadTasks = async (req, res) => {
  try {
    const { userId: user } = req.params

    const projection = getSelectParams(req)
    const populate = customParse(req.query.populate || [])
    const { taskId: task, notificationFor } = req.query

    const where = { user }
    if (notificationFor) where.notificationFor = notificationFor
    if (task) where.task = ObjectId(task)

    const tasks = await findTaskNotifyUsers(where, projection, populate)

    return generalResponse(res, tasks, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 500)
  }
}

export const getUnreadStatus = async (req, res) => {
  try {
    const { userId: user, taskId: task, notificationFor = notificationForType.NEW_TASK } = req.body

    const projection = getSelectParams(req)
    const populate = customParse(req.query.populate || [])

    const existTask = await findTaskNotifyUser(
      { user: ObjectId(user), task: ObjectId(task), notificationFor },
      projection,
      populate
    )

    return generalResponse(res, existTask, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 500)
  }
}

export const deleteUsersUnreadTasks = async (req, res) => {
  try {
    const { userId } = req.params
    const { taskIds = [], notificationFor = notificationForType.NEW_TASK } = req.body

    if (!taskIds || !taskIds.length) {
      return generalResponse(res, false, { text: 'TaskIDs required.' }, 'error', false, 400)
    }

    await removeTaskNotifyUsers({ user: userId, task: { $in: taskIds }, notificationFor })

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 500)
  }
}
