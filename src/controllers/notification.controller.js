import generalResponse from '../helpers/generalResponse.helper'
import {
  deleteUserNotification,
  findUserNotifications,
  getUserNotificationCountRepo,
  updateUserNotificationRepo
} from '../repositories/notification.repository'
import { ObjectId } from 'mongodb'

export const getUserNotifications = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { skip = 1, limit = 10 } = req.query
    const userNotifications = await findUserNotifications({
      where: { user: ObjectId(currentUser._id), company: ObjectId(currentUser.company) },
      populate: [
        {
          path: 'notificationId',
          ref: 'Notifications',
          select: { title: 1, modelName: 1, modelId: 1 },
          populate: [{ path: 'createdBy', ref: 'Users', select: { _id: 1, userProfile: 1, firstName: 1, lastName: 1 } }]
        }
      ],
      paginationConf: {
        skip,
        limit
      },
      projection: {
        status: 1,
        notificationId: 1
      }
    })
    return generalResponse(res, userNotifications, 'success')
  } catch (error) {
    console.log('Error:getUserNotifications', error?.message || error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteUserNotifications = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { id: notificationId } = req.params
    let where = {}
    if (notificationId === 'all') {
      where = { user: ObjectId(currentUser._id), company: ObjectId(currentUser.company) }
    } else {
      where = { notificationId, user: ObjectId(currentUser._id), company: ObjectId(currentUser.company) }
    }
    const userNotifications = await deleteUserNotification(where)
    return generalResponse(res, userNotifications, 'User notification delete successfully.')
  } catch (error) {
    console.log('Error:deleteUserNotifications', error?.message || error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getUserNotificationCount = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { status = 'UNREAD' } = req.query
    const where = { user: ObjectId(currentUser._id), company: ObjectId(currentUser.company), status }
    const userNotifications = await getUserNotificationCountRepo(where)
    return generalResponse(res, userNotifications, 'success')
  } catch (error) {
    console.log('Error:getUserNotificationCount', error?.message || error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateUserNotificationsReadStatus = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    // HELLO
    // let data = req.body
    // data = data?.map((obj) => ({
    //   updateOne: {
    //     filter: {
    //       user: ObjectId(currentUser._id),
    //       company: ObjectId(currentUser.company),
    //       notificationId: obj.notificationId
    //     },
    //     update: {
    //       status: 'READ'
    //     }
    //   }
    // }))
    // const userNotifications = await userNotificationBulkWrite(data || [])

    const userNotifications = await updateUserNotificationRepo(
      {
        user: ObjectId(currentUser._id),
        company: ObjectId(currentUser.company)
      },
      {
        status: 'READ'
      }
    )

    return generalResponse(res, userNotifications, 'success')
  } catch (error) {
    console.log('Error:getUserNotifications', error?.message || error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
