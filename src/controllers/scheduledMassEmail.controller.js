// ====================================================
import { getSelectParams } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import { removeMassEmilSchedulerJob } from '../helpers/jobSchedulerQueue.helper'
import {
  countTotalScheduleMassEmail,
  findAllScheduledMassEmail,
  findScheduledMassEmail,
  updateScheduledMassEmail
} from '../repositories/scheduledMassEmail'

export const getScheduledMassEmails = async (req, res) => {
  try {
    const { page = 1, limit = 100000 } = req.query
    delete req.query?.page
    delete req.query?.limit

    const currentPage = page * 1 || 1
    const recordLimit = limit * 1 || 10
    const skip = recordLimit * (currentPage - 1)

    const scheduledMassEmails = await findAllScheduledMassEmail(
      req.query,
      {
        path: 'massEmailId',
        select: { title: true, saveAs: true, contacts: true }
      },
      { createdAt: -1 },
      skip,
      recordLimit
    )

    const totalScheduleMassEmail = await countTotalScheduleMassEmail(req.query)
    return generalResponse(res, { scheduledMassEmails, totalScheduleMassEmail }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificScheduledMassEmail = async (req, res) => {
  try {
    const populate = [
      {
        path: 'massEmailId',
        ref: 'Mass-email',
        select: { saveAs: true, title: true, template: true }
      },
      {
        path: 'template',
        ref: 'Email-Template',
        select: { _id: 1, htmlBody: 1, name: 1 }
      }
    ]

    if (req.query.withPopulatedContacts) {
      populate.push({
        path: 'contacts',
        ref: 'Contacts',
        select: { _id: 1, userProfile: 1, firstName: 1, lastName: 1, email: 1, phone: 1 }
      })
    }

    const massEmail = await findScheduledMassEmail({ _id: req.params.id }, populate, getSelectParams(req))
    return generalResponse(res, massEmail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const getSpecificScheduledMassEmailContacts = async (req, res) => {
  try {
    const match = {}
    const search = req.query.search || ''
    const reg = new RegExp(search, 'i')

    if (search) {
      match.$or = [{ firstName: { $regex: reg } }, { lastName: { $regex: reg } }, { email: { $regex: reg } }]
    }

    const massEmail = await findScheduledMassEmail(
      { _id: req.params.id },
      [
        {
          path: 'contacts',
          ref: 'Contacts',
          select: getSelectParams(req)
        }
      ],
      { _id: 1 }
    )

    if (!massEmail) {
      return generalResponse(res, false, { text: 'Not Found.' }, 'error', false, 400)
    }

    return generalResponse(res, massEmail.contacts, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const cancelScheduledMassEmailDetail = async (req, res) => {
  try {
    const jobId = req.body.jobId
    await removeMassEmilSchedulerJob(jobId)
    await updateScheduledMassEmail({ _id: req.params.id }, { status: 'CANCELED' })
    return generalResponse(res, null, 'Cancel scheduled mail successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateScheduledMassEmailDetail = async (req, res) => {
  try {
    if (req.body?.contacts?.length && req.params.id) {
      const scheduledEmail = await findScheduledMassEmail({ _id: req.params.id }).select({
        _id: true,
        scheduledTime: true
      })
      const isEditable = new Date(Date.now() + 60000 * 5).getTime() < new Date(scheduledEmail.scheduledTime).getTime()
      if (isEditable) {
        await updateScheduledMassEmail({ _id: req.params.id }, { ...req.body })
        return generalResponse(res, null, 'Update scheduled email successfully!', 'success', true)
      } else {
        throw new Error("You can't edit before 5 minutes of scheduled time!")
      }
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    return generalResponse(res, null, { text: error.message || error }, 'error', true, 400)
  }
}
