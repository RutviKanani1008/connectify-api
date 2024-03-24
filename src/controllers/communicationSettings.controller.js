import { ObjectId } from 'mongodb'
import generalResponse from '../helpers/generalResponse.helper'
import {
  createOrUpdateCommunicationSettingRepo,
  findCommunicationSettingRepo
} from '../repositories/communicationSettings.repository'

export const createOrUpdateCommunicationSetting = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { defaultCCEmails, defaultBCCEmails, view, sidebarOpen, signature } = req.body

    const data = await createOrUpdateCommunicationSettingRepo(
      {
        company,
        user
      },
      {
        defaultBCCEmails,
        defaultCCEmails,
        view,
        sidebarOpen,
        signature
      }
    )

    return generalResponse(res, data, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const getCommunicationSetting = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser

    const data = await findCommunicationSettingRepo({
      company: ObjectId(company),
      user: ObjectId(user)
    })

    return generalResponse(res, data, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}
