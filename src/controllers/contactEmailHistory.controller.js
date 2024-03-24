import { customParse, getSelectParams } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import {
  createContactsEmail,
  findContactsEmail,
  findOneContactsEmail,
  updateContactsEmail
} from '../repositories/ContactsEmail.repository'
import { ObjectId } from 'mongodb'
import {
  createContactMassEmilSchedulerJob,
  removeContactMassEmilSchedulerJob
} from '../helpers/jobSchedulerQueue.helper'
import { taskCreateFromEmail } from '../helper/email.helper'

export const createNewContactEmail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { createTask, subject, htmlBody, contact, attachments = [] } = req.body

    const newScheduledMail = await createContactsEmail({
      ...req.body,
      scheduledTime: req.body.delayTime,
      createdBy: currentUser?._id
    })
    const job = await createContactMassEmilSchedulerJob(
      {
        currentUserName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
        currentUserEmail: currentUser?.email,
        contactEmailId: newScheduledMail._id,
        company: currentUser?.company
      },
      req.body.sendAfter
    )

    if (job.id) {
      // if mail is scheduled then we add in data in scheduled mass email
      await updateContactsEmail(
        {
          _id: newScheduledMail._id
        },
        {
          jobId: job.id
        }
      )
      // Here create task
      if (createTask) {
        await taskCreateFromEmail({
          body: {
            subject,
            html: htmlBody,
            attachments,
            contact
          },
          currentUser,
          appendTitle: 'Email Sent:'
        })
      }
    } else {
      throw new Error('Something went wrong!')
    }
    const contactMassEmail = await findOneContactsEmail({ _id: ObjectId(newScheduledMail._id) })

    return generalResponse(res, contactMassEmail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSendContactEmail = async (req, res) => {
  try {
    const projection = getSelectParams(req)
    const populate = customParse(req.query.populate || [])

    const contactEmail = await findContactsEmail({ ...req.query }, projection, populate)

    return generalResponse(res, contactEmail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const cancelScheduledContactMassEmailDetail = async (req, res) => {
  try {
    const jobId = req.body.jobId
    await removeContactMassEmilSchedulerJob(jobId)
    await updateContactsEmail({ _id: req.body._id }, { status: 'CANCELED' })
    return generalResponse(res, null, 'Cancel scheduled mail successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
