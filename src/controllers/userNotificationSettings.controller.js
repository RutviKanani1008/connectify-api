import generalResponse from '../helpers/generalResponse.helper'
import {
  createUserNotificationSettings,
  findUserNotificationSettings,
  updateUserNotificationSettings
} from '../repositories/userNotificationSettings.repository'
import { ObjectId } from 'mongodb'

export const getUserNotificationSettingsDetails = async (req, res) => {
  try {
    const { id } = req.params
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (!id) {
      return generalResponse(res, false, 'Id is required.', 'error', true, 200)
    }

    let notificationSettings = await findUserNotificationSettings({
      user: ObjectId(id),
      company: ObjectId(currentUser.company)
    })

    if (!notificationSettings) {
      // create a new notification if object no exists
      notificationSettings = await createUserNotificationSettings({
        user: ObjectId(id),
        company: ObjectId(currentUser.company)
      })
    }
    return generalResponse(res, notificationSettings, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateUserNotificationDetails = async (req, res) => {
  try {
    const { id } = req.params
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (!id) {
      return generalResponse(res, false, 'Id is required.', 'error', true, 200)
    }

    const notificationSettings = await findUserNotificationSettings({
      _id: ObjectId(id),
      company: ObjectId(currentUser.company)
    })
    if (notificationSettings) {
      // create a new notification if object no exists
      await updateUserNotificationSettings(
        {
          _id: ObjectId(id),
          company: ObjectId(currentUser.company)
        },
        {
          ...req.body,
          company: ObjectId(currentUser.company)
        }
      )
    } else {
      return generalResponse(res, false, 'Notification setting not found.', 'error', true, 200)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
