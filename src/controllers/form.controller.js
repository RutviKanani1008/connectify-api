/* eslint-disable no-extend-native */
import generalResponse from '../helpers/generalResponse.helper'
import {
  createForms,
  deleteForm,
  findAllForms,
  findFormWithAggregationCount,
  findForms,
  findFormtWithAggregation,
  updateForm
} from '../repositories/forms.repository'
import { generateRandomString } from '../helpers/generateRandomString'
import { upload } from '../helpers/uploadHelper'
import { sendMail } from '../services/send-grid'
import { ObjectId } from 'mongodb'
import { findContact, createContact, updateContactAPI } from '../repositories/contact.repository'
import {
  addDummySchedulerJob,
  createFormMailSchedulerJob,
  removeDummySchedulerJob
} from '../helpers/jobSchedulerQueue.helper'
import { getSelectParams } from '../helpers/generalHelper'
import {
  createFormsResponse,
  deleteFormResponse,
  findFormResponseWithAggregationCount,
  findFormResponsetWithAggregation,
  updateFormResponse
} from '../repositories/formResponse.repository'
import { parseData } from '../utils/utils'
import { checkGoogleReCaptchaVerification } from '../services/recaptcha/recaptcha'
import { createTasks, findLastTask } from '../repositories/task.repository'
import { findUser } from '../repositories/users.repository'
import { createContactActivity } from '../repositories/contactActivities'
import { AVAILABLE_ACTIVITY_FOR, AVAILABLE_EVENT_TYPE } from '../models/contact-activity'
import { removeSpecialCharactersFromString } from '../helpers/formResponse.helper'
import { sendNotificationJob } from '../schedular-jobs/notification'
import { FORMS_NOTIFICATION_ACTION, NOTIFICATION_MODULE_TYPE } from '../services/notification/constants'
import { deleteAttachmentFromWasabi } from '../middlewares/fileUploader'
import _ from 'lodash'
export const createForm = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const isExist = await findForms({ title: req.body.title, company: req.body.company })
    if (isExist) {
      return generalResponse(res, '', { text: 'Form name should be unique.' }, 'error', false, 400)
      //
    }
    const slug = generateRandomString(10)
    if (!req?.body?.notificationOptional) {
      req.body.notification = null
    }
    if (!req?.body?.autoresponderOptional) {
      req.body.autoresponder = null
    }
    if (
      !req?.body?.thankYouOptional ||
      (req?.body?.thankYouOptional === '' && req.body.afterFormSubmit === 'redirectLink')
    ) {
      req.body.thankyou = null
    }
    if (!req.body.afterFormSubmit === 'thankYouPage') {
      req.body.redirectLink = null
    }
    if (req?.body?.notification && req?.body?.notification?.emails && req?.body?.notification?.emails?.length > 0) {
      const temp = []
      req.body.notification.emails.forEach((email) => {
        if (email !== '') {
          temp.push(email.value)
        }
      })
      req.body.notification.emails = temp
    }
    const create = await createForms({ ...req.body, slug, createdBy: currentUser._id })

    return generalResponse(res, create, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getFormDetail = async (req, res) => {
  try {
    const form = await findForms({ _id: req.params.id }, {}, [
      { path: 'group.id', ref: 'Groups' },
      { path: 'status.id', ref: 'Status' },
      { path: 'category.id', ref: 'Category' },
      { path: 'tags.id', ref: 'Tags' },
      { path: 'pipeline.id', ref: 'Pipeline' }
    ])

    return generalResponse(res, form, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getFormResponseDetail = async (req, res) => {
  try {
    const { limit = 3, page = 1, search = '' } = req.query
    const skip = Number(limit) * Number(page) - Number(limit)

    const regexPattern = new RegExp(search, 'i')

    const totalResponse = await findFormResponseWithAggregationCount({
      match: { form: ObjectId(req.params.formId) },
      ...(search && { search: regexPattern })
    })

    const formResponse = await findFormResponsetWithAggregation({
      match: { form: ObjectId(req.params.formId) },
      limit: Number(limit),
      skip,
      ...(search && { search: regexPattern })
    })

    const form = await findForms({ _id: req.params.formId }, {}, [])

    const obj = {}
    obj.form = form
    obj.responses = formResponse
    obj.totalFormResponse = totalResponse?.[0]?.count || 0
    return generalResponse(res, obj, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getForms = async (req, res) => {
  try {
    let { limit = 10, page = 1, search = '', sort, archived = false, companyId } = req.query
    const project = { ...getSelectParams(req) }
    const skip = Number(limit) * Number(page) - Number(limit)
    sort = parseData(sort)

    const $and = [{ archived: archived === 'true' }]
    if (companyId) {
      $and.push({ company: ObjectId(companyId) })
    }
    if (search) {
      const reg = new RegExp(search, 'i')
      $and.push({
        $or: [{ title: { $regex: reg } }, { description: { $regex: reg } }, { slug: { $regex: reg } }]
      })
    }

    const match = { ...($and.length ? { $and } : {}) }

    const total = await findFormWithAggregationCount({
      match
    })

    const forms = await findFormtWithAggregation({ limit: Number(limit), skip, match, sort, project })

    let form

    const select = getSelectParams(req)

    if (req?.query && req?.query?.slug) {
      form = await findForms(req.query, select, { path: 'company' })

      return generalResponse(res, form, 'success')
    } else if (req?.query && req?.query?.['group.id']) {
      // temporary fix
      console.log('manage groups / members ')
      form = await findAllForms(req.query, select, { createdAt: -1 })
      return generalResponse(res, form, 'success')
    }
    return generalResponse(res, { results: forms, pagination: { total: total[0]?.count } }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateForms = async (req, res) => {
  try {
    if (req.body.updateName) {
      const isExist = await findForms({ title: req.body.title, company: req.body.company })
      if (isExist) {
        return generalResponse(res, '', { text: 'Form name should be unique.' }, 'error', false, 400)
      }
    }
    if (req.body?.notification && req.body?.notification?.emails && req.body?.notification?.emails?.length > 0) {
      const temp = []
      req.body.notification.emails.forEach((email) => {
        if (email !== '') {
          temp.push(email?.value)
        }
      })
      req.body.notification.emails = temp
    }
    if (!req?.body?.notificationOptional) {
      req.body.notification = null
    }
    if (!req?.body?.autoresponderOptional) {
      req.body.autoresponder = null
    }
    if (req.body.afterFormSubmit === 'redirectLink') {
      req.body.thankyou = null
    }
    if (!req.body.afterFormSubmit === 'thankYouPage') {
      req.body.redirectLink = null
    }
    await updateForm({ _id: req.params.id }, { ...req.body })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateFormsResponse = async (req, res) => {
  try {
    await updateFormResponse({ _id: req.params.id }, { ...req.body })
    const { removeAttachments = [] } = req.body
    if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
      await deleteAttachmentFromWasabi(removeAttachments)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const createResponse = async (req, res) => {
  try {
    const { token, removeAttachments = [], ...reqBody } = req.body
    if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
      await deleteAttachmentFromWasabi(removeAttachments)
    }
    delete req.body?.removeAttachments
    const form = await findForms({ slug: req.params.id })
    if (form.allowReCaptcha) {
      const check = await checkGoogleReCaptchaVerification(token)
      if (!check) {
        return generalResponse(res, null, 'Something went wrong', 'error', false, 400)
      }
    }
    const response = await createFormsResponse({
      email: req?.body?.Email,
      response: reqBody,
      form: form?._id,
      company: ObjectId(JSON.parse(JSON.stringify(form.company)))
    })

    const { fields } = form
    let contact = null
    // ------- add detail in contact when form submit ---------
    if (fields.find((field) => field.mappedContactField !== null)) {
      const mappedContactFields = {}
      const questions = []

      form.fields.forEach((field) => {
        if (['email'].includes(field.type) && field.mappedContactField && field.mappedContactField !== 'custom-field') {
          mappedContactFields[field.mappedContactField] = req.body[field.label]
        }

        if (field.mappedContactField === 'custom-field') {
          questions.push({
            question: field?.label,
            answer:
              field?.type === 'select'
                ? reqBody?.[removeSpecialCharactersFromString(field.label)]?.value ?? ''
                : field?.type === 'multiSelect' && reqBody?.[removeSpecialCharactersFromString(field.label)].length
                ? reqBody?.[removeSpecialCharactersFromString(field.label)]?.map((obj) => obj.label)?.join(', ')
                : reqBody?.[removeSpecialCharactersFromString(field.label)]
          })
        }
      })

      if (Object.keys(mappedContactFields).length) {
        contact = await findContact({
          ...mappedContactFields,
          company: ObjectId(JSON.parse(JSON.stringify(form.company)))
        })
      }
      form.fields.forEach((field) => {
        if (
          !['email'].includes(field.type) &&
          field.mappedContactField &&
          field.mappedContactField !== 'custom-field'
        ) {
          mappedContactFields[field.mappedContactField] = req.body[field.label]
        }
      })
      const contactBody = {
        email: req?.body?.Email || null,
        company: JSON.parse(JSON.stringify(form.company)),
        ...mappedContactFields
      }
      if (form.isFormAssignments && form.group?.id) {
        contactBody.group = { id: JSON.parse(JSON.stringify(form.group?.id)) }
        form.status?.id && (contactBody.status = { id: JSON.parse(JSON.stringify(form.status?.id)) })
        form.category?.id && (contactBody.category = { id: JSON.parse(JSON.stringify(form.category?.id)) })
        form.tags &&
          form.tags?.length &&
          (contactBody.tags = form.tags?.map((obj) => JSON.parse(JSON.stringify(obj.id))))
      }
      if (contact) {
        await updateContactAPI({ _id: new ObjectId(contact?._id) }, { ...contactBody, questions })
      } else {
        contact = await createContact({ firstName: '', lastName: '', ...contactBody, questions })

        await createContactActivity({
          eventType: AVAILABLE_EVENT_TYPE.NEW_CONTACT_CREATE_FROM_FILLING_MARKETING_FORM,
          contact: contact?._id,
          eventFor: AVAILABLE_ACTIVITY_FOR.contact,
          refId: contact?._id,
          company: ObjectId(JSON.parse(JSON.stringify(form.company))),
          createdBy: null,
          otherReferenceField: ObjectId(form?._id),
          otherReferenceFieldModel: 'forms',
          otherFormFieldDetails: {
            formDetail: {
              title: form.title,
              description: form.description,
              fields: form.fields
            },
            formAutoResponderDetail: form?.autoresponder || null,
            responseDetails: {
              ...req?.body
            }
          }
        })
        await sendNotificationJob({
          module: NOTIFICATION_MODULE_TYPE.FORMS,
          data: {
            contactId: contact?._id,
            action: FORMS_NOTIFICATION_ACTION.CONTACT_CREATION,
            formId: form?._id,
            responseId: response._id,
            companyId: form.company
          }
        })
      }
    }

    if (form && form?.autoresponder && form?.autoresponder?.htmlBody && form.autoresponderOptional) {
      // ----------------- send mail add in job queue ----------------------
      createFormMailSchedulerJob(
        {
          ...reqBody,
          slug: req.params.id,
          autoresponder: true
        },
        form.autoResponderDelay
      )
    }

    if (
      form &&
      form?.notification &&
      form?.notification?.emails &&
      form?.notification?.htmlBody &&
      form?.notification?.emails?.length > 0 &&
      form.notificationOptional
    ) {
      // ----------------- send mail add in job queue ----------------------
      createFormMailSchedulerJob(
        {
          ...reqBody,
          slug: req.params.id,
          notification: true
        },
        form.notificationDelay
      )
    }
    if (form && form.createTaskOnSubmit) {
      // ------------------ create task when form is submitted -----------------

      /** if not form creator details, use company admin as creator */
      const createdBy = form.createdBy
        ? form.createdBy
        : (await findUser({ company: form.company, role: 'admin' }))?._id
      if (createdBy) {
        const lastTask = await findLastTask({
          params: { company: form.company },
          projection: { taskNumber: 1 }
        })
        const newTaskNumber = !lastTask?.taskNumber ? 1000 : +lastTask.taskNumber + 1
        const description = form.fields
          .map((field) => {
            return `${field.label}: ${response.response[field.label] || '-'}`
          })
          .join('\n')
        const tasks = await createTasks([
          {
            taskNumber: newTaskNumber,
            name: form.title,
            details: description,
            contact: contact?._id,
            createdBy,
            startDate: response.createdAt,
            endDate: response.createdAt,
            order: 0,
            kanbanCategotyOrder: 0,
            kanbanStatusOrder: 0,
            kanbanPriorityOrder: 0,
            company: form.company
          }
        ])
        console.log('task created', tasks)
      }
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const cloneForm = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const form = await findForms({ _id: req.params.id })
    const formDetails = JSON.parse(JSON.stringify(form))
    let title = `Copy of ${formDetails.title}`
    const isExistForm1 = await findForms({ title: `Copy of ${formDetails.title}` })
    if (isExistForm1) {
      title = `Copy of Copy of ${formDetails.title}`
      const isExistForm2 = await findForms({ title: `Copy of Copy of ${formDetails.title}` })
      if (isExistForm2) {
        title = `${formDetails.title}_${new Date().getTime()}`
      }
    }
    if (formDetails) {
      const slug = generateRandomString(10)
      formDetails.title = title
      formDetails.active = true
      formDetails.slug = slug
    }
    delete formDetails?.createdAt
    delete formDetails._id
    const createForm = await createForms({ ...formDetails, createdBy: currentUser._id })
    return generalResponse(res, createForm, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteFormDetail = async (req, res) => {
  try {
    await deleteForm({ _id: req.params.id })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteFormResponseDetail = async (req, res) => {
  try {
    await deleteFormResponse({ _id: req.params.id })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const uploadFormFile = async (req, res) => {
  try {
    const fileUpload = await upload(req?.files?.image, 'forms')
    return generalResponse(res, fileUpload, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const sendTestMail = async (req, res) => {
  try {
    const form = await findForms({ _id: ObjectId(req.body.id) }, {}, [
      { path: 'company', select: { email: true, name: true } }
    ])
    if (form && form.autoresponder && form.autoresponder.htmlBody && req.body.type === 'autoresponder') {
      // Autoresponder mail
      sendMail({
        sender: form?.company?.email ? form?.company?.email : 'no-reply@xyz.com',
        senderName: form?.company?.name,
        receiver: req.body.email,
        subject: form?.autoresponder?.subject,
        htmlBody: form.autoresponder.htmlBody
      })
    }
    if (
      form &&
      form?.notification &&
      form.notification.emails &&
      form.notification.emails.length > 0 &&
      req.body.type === 'notifications' &&
      form?.notification?.htmlBody
    ) {
      sendMail({
        sender: form?.company?.email ? form?.company?.email : 'no-reply@xyz.com',
        senderName: form?.company?.name,
        receiver: req.body.email,
        subject: form?.notification?.subject,
        htmlBody: form?.notification?.htmlBody
      })
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

// -----------------------------------------------------
export const addTestSchedule = async (req, res) => {
  try {
    addDummySchedulerJob(
      {
        test: true
      },
      req.body.delay
    )

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const removeTestSchedule = async (req, res) => {
  try {
    removeDummySchedulerJob(req.body.jobId)
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
