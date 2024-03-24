import generalResponse from '../helpers/generalResponse.helper'
import {
  getAllContactActivitiesWithPopulate,
  getAllContactActivitiesWithPopulateCount
} from '../repositories/contactActivities'
import { ObjectId } from 'mongodb'

export const getAllContactActivities = async (req, res) => {
  try {
    const { contact = null, createdBy = null, isUserTab = null, page = 1, limit = 15 } = req.query
    const match = {}
    if (isUserTab) {
      match.$or = [
        { $and: [{ contact: new ObjectId(contact) }, { createdBy: new ObjectId(createdBy) }] },
        { $and: [{ contact: new ObjectId(contact) }, { createdBy: new ObjectId(contact) }] }
      ]
    } else if (contact) {
      match.contact = new ObjectId(contact)
    } else if (createdBy) {
      match.$or = [{ contact: new ObjectId(createdBy) }, { createdBy: new ObjectId(createdBy) }]
    }
    const contactActivity = await getAllContactActivitiesWithPopulate(
      match,
      Number(limit) * Number(page) - Number(limit),
      Number(limit)
    )

    const activityCount = await getAllContactActivitiesWithPopulateCount(match)
    return generalResponse(
      res,
      { activities: contactActivity, total: activityCount?.[0]?.totalActivity || 0 },
      '',
      'success'
    )
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
