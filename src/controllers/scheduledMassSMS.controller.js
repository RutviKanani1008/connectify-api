import generalResponse from '../helpers/generalResponse.helper'
import { removeMassSMSSchedulerJob } from '../helpers/jobSchedulerQueue.helper'
import { findAllScheduledMassSMS, findScheduledMassSMS, updateScheduledMassSMS } from '../repositories/scheduledMassSMS'

export const getAllScheduledMassSMS = async (req, res) => {
  try {
    const massSMS = await findAllScheduledMassSMS(req.query, {
      path: 'massSMSId',
      select: { title: true, saveAs: true, contacts: true }
    })
    return generalResponse(res, massSMS, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificScheduledMassSMS = async (req, res) => {
  try {
    const populate = [
      {
        path: 'massSMSId',
        ref: 'Mass-SMS',
        select: { saveAs: true, title: true, template: true }
      },
      {
        path: 'template',
        ref: 'Sms-Template',
        select: { _id: 1, body: 1, name: 1 }
      }
    ]

    if (req.query.withPopulatedContacts) {
      populate.push({
        path: 'contacts',
        ref: 'Contacts',
        select: { _id: 1, userProfile: 1, firstName: 1, lastName: 1, email: 1, phone: 1 }
      })
    }

    const massSMS = await findScheduledMassSMS({ _id: req.params.id }, populate)
    return generalResponse(res, massSMS, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const cancelScheduledMassSMSDetail = async (req, res) => {
  try {
    const jobId = req.body.jobId
    await removeMassSMSSchedulerJob(jobId)
    await updateScheduledMassSMS({ _id: req.params.id }, { status: 'CANCELED' })
    return generalResponse(res, null, 'Cancel scheduled sms successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const updateScheduledMassSMSDetail = async (req, res) => {
  try {
    if (req.body?.contacts?.length && req.params.id) {
      const scheduledSMS = await findScheduledMassSMS({ _id: req.params.id }).select({ _id: true, scheduledTime: true })
      const isEditable = new Date(Date.now() + 60000 * 5).getTime() < new Date(scheduledSMS.scheduledTime).getTime()
      if (isEditable) {
        await updateScheduledMassSMS({ _id: req.params.id }, { ...req.body })
        return generalResponse(res, null, 'Update scheduled sms successfully!', 'success', true)
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
