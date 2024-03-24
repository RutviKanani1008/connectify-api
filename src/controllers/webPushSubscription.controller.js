// HELLO
// import webPush from 'web-push'
import generalResponse from '../helpers/generalResponse.helper'
import {
  createOrUpdateWebSubscriptionRepo,
  deleteWebPushSubscriptionRepo
} from '../repositories/webPushSubscription.repository'
// import { COMPANY_LOGO_URL } from '../constants'

export const addWebPushSubscription = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    await createOrUpdateWebSubscriptionRepo(
      {
        company: currentUser.company,
        user: currentUser._id,
        deviceId: currentUser.deviceId
      },
      {
        ...req.body
      }
    )

    // const options = {
    //   vapidDetails: {
    //     subject: 'mailto:myemail@example.com',
    //     publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
    //     privateKey: process.env.WEB_PUSH_PRIVATE_KEY
    //   }
    // }

    // await webPush.sendNotification(
    //   req.body,
    //   JSON.stringify({
    //     title: 'Hello from server',
    //     description: 'this message is coming from the server',
    //     image: COMPANY_LOGO_URL
    //   }),
    //   options
    // )

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log('Error:addWebPushSubscription', error?.message || error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteWebPushSubscription = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    await deleteWebPushSubscriptionRepo({
      company: currentUser.company,
      user: currentUser._id,
      deviceId: currentUser.deviceId
    })

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log('Error:deleteWebPushSubscription', error?.message || error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
