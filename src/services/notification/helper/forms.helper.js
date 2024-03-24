/* eslint-disable no-unused-vars */
import { findForms } from '../../../repositories/forms.repository'
import { findUserWithNotificationSettings } from '../../../repositories/users.repository'
import { FORMS_NOTIFICATION_ACTION, NOTIFICATION_MODULE_TYPE } from '../constants'
import { findContact } from '../../../repositories/contact.repository'
import { sendWebPushNotification } from '..'
import { FORM_NOTIFICATION_MSG } from '../constants/message.constant'

export const formsNotificationHelper = async (data) => {
  try {
    const { action, ...rest } = data
    switch (action) {
      case FORMS_NOTIFICATION_ACTION.CONTACT_CREATION:
        await formContactCreationNotification(rest)
        break
    }
  } catch (error) {
    console.log('Error:formsNotificationHelper', error?.message || error)
  }
}

const formContactCreationNotification = async (data) => {
  try {
    const { contactId, formId, companyId } = data
    const form = await findForms({ _id: formId, active: true }, { title: 1, createdBy: 1 })
    const contact = await findContact({ _id: contactId }, [], { firstName: 1, lastName: 1, email: 1 })

    // const creatorDetail = await findUser(
    //   { _id: ObjectId(form.createdBy) },
    //   {
    //     _id: 1,
    //     userProfile: 1,
    //     firstName: 1,
    //     lastName: 1
    //   }
    // )

    const title = FORM_NOTIFICATION_MSG.CREATE_CONTACT_FROM_FORM({
      contactTitle: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
      formTitle: form.title
    })

    if (form) {
      const usersWithNotificationSettings = await findUserWithNotificationSettings(
        companyId,
        {},
        { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 },
        'form',
        ['contactCreationNotifications'],
        'platForm'
      )

      await sendWebPushNotification({
        company: companyId,
        createdBy: form.createdBy,
        modelId: contact._id,
        modelName: NOTIFICATION_MODULE_TYPE.CONTACT,
        title,
        userIds: usersWithNotificationSettings.map((obj) => obj._id),
        wePushNotificationTitle: 'Form'
      })

      // const notification = await createNotification({
      //   company: companyId,
      //   title: description,
      //   modelId: contact._id,
      //   modelName: NOTIFICATION_MODULE_TYPE.CONTACT,
      //   createdBy: form.createdBy
      // })

      // await createNotificationUsers(
      //   adminUsers.map((user) => ({
      //     insertOne: {
      //       document: {
      //         company: companyId,
      //         user,
      //         notificationId: notification._id
      //       }
      //     }
      //   }))
      // )

      // for (const user of adminUsers) {
      //   const webSubscriptions = await getWebSubscriptions({ company: companyId, user: user._id })
      //   for (const webSubscription of webSubscriptions) {
      //     const { endpoint, expirationTime, keys } = webSubscription
      //     try {
      //       await sendWebPushNotification({
      //         endpoint,
      //         expirationTime,
      //         keys,
      //         title,
      //         description
      //       })
      //     } catch (error) {
      //       console.log('Error:webPush.sendNotification', error?.message || error)
      //     }
      //   }
      //   await emitRequest({
      //     eventName: 'handle-notification',
      //     eventData: {
      //       modelId: contact._id,
      //       notificationId: notification._id,
      //       title: description,
      //       modelName: NOTIFICATION_MODULE_TYPE.CONTACT,
      //       createdBy: creatorDetail
      //     },
      //     userId: user._id
      //   })
      // }
    }
  } catch (error) {
    console.log('Error:formContactCreationNotification', error?.message || error)
  }
}
