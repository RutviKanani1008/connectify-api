import webPush from 'web-push'
import _ from 'lodash'
import { ObjectId } from 'mongodb'
import { COMPANY_LOGO_URL } from '../../constants'
import { NOTIFICATION_MODULE_TYPE } from './constants'
import { formsNotificationHelper } from './helper/forms.helper'
import { taskManagerNotificationHelper } from './helper/taskManager.helper'
import { deleteWebPushSubscriptionRepo, getWebSubscriptions } from '../../repositories/webPushSubscription.repository'
import { createNotification } from '../../repositories/notification.repository'
import { emitRequest } from '../../helper/socket-request.helper'
import { createNotificationUsers } from '../../repositories/notificationUser.repository'
import { findUser } from '../../repositories/users.repository'
import { userNotificationHelper } from './helper/user.helper'

export const sendNotificationConsumer = async (jobData, done) => {
  try {
    switch (jobData?.module) {
      case NOTIFICATION_MODULE_TYPE.TASK_MANAGER: {
        await taskManagerNotificationHelper(jobData.data)
        break
      }
      case NOTIFICATION_MODULE_TYPE.FORMS: {
        await formsNotificationHelper(jobData.data)
        break
      }
      case NOTIFICATION_MODULE_TYPE.USER: {
        await userNotificationHelper(jobData.data)
        break
      }
    }
    return done()
  } catch (error) {
    console.log('Error:sendNotificationConsumer', error?.message || error)
    return done()
  }
}

export const sendWebPushNotification = async ({
  title,
  company,
  userIds,
  modelName,
  modelId,
  createdBy,
  wePushNotificationTitle
}) => {
  const options = {
    vapidDetails: {
      subject: `mailto:${process.env.FROM_EMAIL}`,
      publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
      privateKey: process.env.WEB_PUSH_PRIVATE_KEY
    }
  }

  const creatorDetail = await findUser(
    { _id: ObjectId(createdBy) },
    {
      _id: 1,
      userProfile: 1,
      firstName: 1,
      lastName: 1
    }
  )

  const notification = await createNotification({
    company,
    title,
    modelId,
    createdBy,
    modelName
  })

  await createNotificationUsers(
    userIds.map((userId) => ({
      insertOne: {
        document: {
          company,
          user: userId,
          notificationId: notification._id
        }
      }
    }))
  )

  for (const userId of userIds) {
    const webSubscriptions = await getWebSubscriptions({ company, user: userId })
    const uniqueWebSubscriptions = _.unionBy(webSubscriptions, 'endpoint')
    for (const webSubscription of uniqueWebSubscriptions) {
      const { endpoint, expirationTime, keys } = webSubscription

      // HELLO
      console.log('-------', endpoint)

      try {
        await webPush.sendNotification(
          {
            endpoint,
            expirationTime,
            keys
          },
          JSON.stringify({
            title: wePushNotificationTitle,
            description: title,
            image: COMPANY_LOGO_URL
          }),
          options
        )
      } catch (error) {
        if (error?.message === 'Received unexpected response code') {
          const matchedSubscription = webSubscriptions?.filter((obj) => obj.endpoint === endpoint)
          const deletableIds = matchedSubscription?.map((obj) => obj._id)
          if (deletableIds) {
            await deleteWebPushSubscriptionRepo({
              _id: { $in: deletableIds }
            })
          }
        }
        console.log('Error:webPush.sendNotification', error?.message || error)
      }
    }
    await emitRequest({
      eventName: 'handle-notification',
      eventData: {
        modelId,
        notificationId: notification._id,
        title,
        modelName,
        createdBy: creatorDetail
      },
      userId
    })
  }
}
