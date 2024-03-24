import { ObjectId } from 'mongodb'

import generalResponse from '../helpers/generalResponse.helper'
import { createMassSMSSchedulerJob } from '../helpers/jobSchedulerQueue.helper'
import {
  createMassSMS,
  deleteMassSMS,
  findAllMassSMS,
  findMassSMS,
  updateMassSMS
} from '../repositories/massSMS.repository'
import { createScheduledMassSMS, findScheduledMassSMS, updateScheduledMassSMS } from '../repositories/scheduledMassSMS'
import { findOneSmsTemplate } from '../repositories/smsTemplates.repository'

export const getMassSMSDetails = async (req, res, next) => {
  try {
    const massSMS = await findAllMassSMS(req.query)
    return generalResponse(res, massSMS, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const getSpecificMassSMSDetails = async (req, res, next) => {
  try {
    if (!req.params.id) {
      return generalResponse(res, false, { text: 'Mass SMS Id is required.' }, 'error', false, 400)
    }
    const massSMS = await findMassSMS({ _id: req.params.id }, [
      { path: 'template', ref: 'Sms-Template' },
      { path: 'contacts', ref: 'Contacts' }
    ])
    return generalResponse(res, massSMS, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const addMassSMSDetail = async (req, res, next) => {
  try {
    const currentUser = req.headers.authorization
    const q = { title: req.body.title }
    q.company = currentUser.company
    const massSMS = await findAllMassSMS(q)
    if (massSMS && massSMS.length > 0) {
      return generalResponse(res, false, { text: 'MassSMS Already Exists.' }, 'error', false, 400)
    }
    const newMassSMS = await createMassSMS(req.body)
    return generalResponse(res, newMassSMS, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const sendMassSMSWithoutSave = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const q = {}
    q.company = currentUser.company
    const data = req.body

    if (!data?.contacts?.length) {
      return generalResponse(res, false, { text: 'At least one contact required.' }, 'error', false, 400)
    }

    const template = await findOneSmsTemplate({ _id: ObjectId(data.template) })
    if (!template) {
      return generalResponse(res, false, { text: 'Template does not exists.' }, 'error', false, 400)
    }

    const contactPhoneNumbers = Object.values(data.contacts).map((obj) => obj.phone)

    const hasContactsContainNumber = contactPhoneNumbers.every(Boolean)

    if (!hasContactsContainNumber) {
      return generalResponse(res, false, { text: "One or more contact doesn't have phone number" }, 'error', false, 400)
    }

    const contactIds = Object.values(data.contacts).map((obj) => obj._id)

    const newMassSMS = await createMassSMS({
      contacts: contactIds,
      template: data.template,
      company: data.company,
      title: new Date().getTime(),
      saveAs: false
    })

    if (newMassSMS) {
      const isExist = await findScheduledMassSMS({
        scheduledJobName: data.title,
        ...q
      })

      if (isExist) {
        return generalResponse(res, false, { text: 'Scheduled job title already exist' }, 'error', false, 400)
      }

      const newScheduledSMS = await createScheduledMassSMS({
        scheduledTime: data.delayTime,
        company: data.company,
        massSMSId: newMassSMS._id,
        scheduledJobName: data.title,
        contacts: contactIds,
        template: data.template
      })

      const job = await createMassSMSSchedulerJob(
        { massSMSId: newMassSMS._id, scheduledId: newScheduledSMS._id },
        req.body.sendAfter
      )

      if (job.id) {
        await updateScheduledMassSMS({ _id: newScheduledSMS._id }, { jobId: job.id })
      } else {
        throw new Error('Something went wrong!')
      }
    }

    return generalResponse(res, null, 'SMS Send Successfully', 'success')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const sendMassSMSById = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const massSMS = await findMassSMS({ _id: req.params.id }, [
      { path: 'template', ref: 'Sms-Template' },
      { path: 'contacts', ref: 'Contacts' }
    ])

    const contactIds = massSMS.contacts.map((obj) => obj._id)

    if (!massSMS) {
      return generalResponse(res, false, { text: 'Mass SMS does not exists.' }, 'error', false, 400)
    }

    if (!massSMS?.contacts?.length) {
      return generalResponse(res, false, { text: 'No contacts found.' }, 'error', false, 400)
    }

    const contactPhoneNumbers = Object.values(massSMS.contacts).map((obj) => obj.phone)

    const hasContactsContainNumber = contactPhoneNumbers.every(Boolean)

    if (!hasContactsContainNumber) {
      return generalResponse(res, false, { text: "One or more contact doesn't have phone number" }, 'error', false, 400)
    }

    if (!massSMS.template?.body) {
      return generalResponse(res, false, { text: 'Template does not have message body' }, 'error', false, 400)
    }

    const data = req.body

    const isExist = await findScheduledMassSMS({
      scheduledJobName: data.title,
      company: currentUser.company
    })

    if (isExist) {
      return generalResponse(res, false, { text: 'Scheduled job title already exist' }, 'error', false, 400)
    }

    const newScheduledSMS = await createScheduledMassSMS({
      scheduledTime: data.delayTime,
      company: data.company,
      massSMSId: req.params.id,
      scheduledJobName: data.title,
      contacts: contactIds,
      template: massSMS.template._id
    })

    const job = await createMassSMSSchedulerJob(
      { massSMSId: req.params.id, scheduledId: newScheduledSMS._id },
      req.body.sendAfter
    )

    if (job.id) {
      await updateScheduledMassSMS({ _id: newScheduledSMS._id }, { jobId: job.id })
    } else {
      throw new Error('Something went wrong!')
    }

    return generalResponse(res, null, 'SMS Send Successfully', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const updateMassSMSDetail = async (req, res) => {
  try {
    if (!req.params.id) {
      return generalResponse(res, false, { text: 'Mass SMS Id is required.' }, 'error', false, 400)
    }
    delete req.body._id
    await updateMassSMS({ _id: ObjectId(req.params.id) }, req.body)
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const deleteMassSMSDetail = async (req, res) => {
  try {
    if (!req.params.id) {
      return generalResponse(res, false, { text: 'Mass SMS Id is required.' }, 'error', false, 400)
    }
    await deleteMassSMS({ _id: ObjectId(req.params.id) })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
