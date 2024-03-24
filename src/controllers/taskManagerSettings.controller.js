import { ObjectId } from 'mongodb'
import generalResponse from '../helpers/generalResponse.helper'
import {
  createOrUpdateTaskManagerSettingRepo,
  findTaskManagerSettingRepo
} from '../repositories/taskManagerSettings.repository'

export const createOrUpdateTaskManagerSetting = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { alertOnTaskComplete } = req.body

    const data = await createOrUpdateTaskManagerSettingRepo({ company, user }, { alertOnTaskComplete })

    return generalResponse(res, data, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const getTaskManagerSetting = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser

    const data = await findTaskManagerSettingRepo({
      company: ObjectId(company),
      user: ObjectId(user)
    })

    return generalResponse(res, data, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}
