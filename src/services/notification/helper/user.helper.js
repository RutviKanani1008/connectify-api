import { findCompanyAdminUser } from '../../../repositories/users.repository'
import { NOTIFICATION_MODULE_TYPE, USER_NOTIFICATION_ACTION } from '../constants'
import { sendWebPushNotification } from '..'

import { USER_NOTIFICATION_MSG } from '../constants/message.constant'

export const userNotificationHelper = async (data) => {
  try {
    const { action, ...rest } = data
    switch (action) {
      case USER_NOTIFICATION_ACTION.CREATE:
        await userCreateNotification(rest)
        break
    }
  } catch (error) {
    console.log('Error:userNotificationHelper', error?.message || error)
  }
}

const userCreateNotification = async (data) => {
  try {
    const { userName, userId, companyId, createdBy } = data

    const adminUsers = await findCompanyAdminUser(
      companyId,
      {
        _id: { $nin: [createdBy] },
        active: true
      },
      { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 }
    )

    await sendWebPushNotification({
      company: companyId,
      createdBy,
      modelId: userId,
      modelName: NOTIFICATION_MODULE_TYPE.USER,
      title: USER_NOTIFICATION_MSG.CREATE_USER_FOR_ADMIN({
        userName
      }),
      userIds: adminUsers.map((obj) => obj._id),
      wePushNotificationTitle: 'User'
    })
  } catch (error) {
    console.log('Error:userCreateNotification', error?.message || error)
  }
}
