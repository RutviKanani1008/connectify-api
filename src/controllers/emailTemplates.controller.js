import generalResponse from '../helpers/generalResponse.helper'
import { validateContact } from '../models/contacts'
import {
  createEmailTemplate,
  deleteEmailTemplates,
  findOneEmailTemplate,
  findEmailTemplates,
  updateEmailTemplate,
  findEmailTemplateWithAggregationCount,
  findEmailTemplateWithAggregation,
  updateManyEmailTemplate
} from '../repositories/emailTemplates.repository'
import { findOneCompany, updateCompany } from '../repositories/companies.repository'
import { sendMail } from '../services/send-grid'
import { getSelectParams } from '../helpers/generalHelper'
import { sendMassSMS } from '../services/sms/sendSms'
import { ObjectId } from 'mongodb'
import { parseData } from '../utils/utils'

export const getEmailTemplates = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const q = req?.query
    if (!q.isAutoResponderTemplate) {
      q.company = currentUser.company
    }

    const templates = await findEmailTemplates(q, getSelectParams(req))
    return generalResponse(res, templates, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const listEmailTemplates = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company: companyId } = currentUser
    let { limit = 10, page = 1, search = '', sort, folder = null } = req.query
    const project = { ...getSelectParams(req) }
    const skip = Number(limit) * Number(page) - Number(limit)
    sort = parseData(sort)

    const $and = [{ company: ObjectId(companyId) }]

    if (search) {
      const reg = new RegExp(search, 'i')
      $and.push({
        $or: [{ name: { $regex: reg } }, { subject: { $regex: reg } }]
      })
    }

    if (folder) {
      if (ObjectId.isValid(folder)) {
        $and.push({
          $or: [{ folder: ObjectId(folder) }]
        })
      } else if (folder === 'unassigned') {
        $and.push({
          $or: [{ folder: null }]
        })
      }
    }

    const match = { ...($and.length ? { $and } : {}) }

    const total = await findEmailTemplateWithAggregationCount({
      match
    })
    const templates = await findEmailTemplateWithAggregation({
      match,
      limit: Number(limit),
      project,
      skip,
      sort
    })
    return generalResponse(res, { results: templates, pagination: { total: total[0]?.count || 0 } }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const checkEmailTemplateAlreadyExist = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const { name } = req.body

    if (!name) {
      return generalResponse(res, false, { text: 'Template name is required.' }, 'error', false, 400)
    }

    const isExist = await findOneEmailTemplate({ name, company: currentUser.company })
    if (isExist) {
      return generalResponse(res, false, { text: 'Template Already Exist with this name.' }, 'error', false, 400)
    }

    return generalResponse(res, null, 'Template Available')
  } catch (error) {
    console.log('Error:checkEmailTemplateAlreadyExist', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const saveEmailTemplate = async (req, res) => {
  try {
    const data = req.body
    data.company = req.headers.authorization.company
    let saved = null
    if (validateContact(data)) {
      if (data._id) {
        const { name, htmlBody, jsonBody, _id, subject, folder = null } = data
        await updateEmailTemplate({ _id }, { name, jsonBody, htmlBody, subject, folder })
        saved = await findOneEmailTemplate({ _id })
        return generalResponse(res, saved, 'Template updated successfully!', 'success', true)
      } else {
        saved = await createEmailTemplate(data)
        return generalResponse(res, saved, 'Template created successfully!', 'success', true)
      }
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteEmailTemplate = async (req, res) => {
  try {
    const template = await findOneEmailTemplate({ _id: req.params.id, company: req.headers.authorization.company })
    if (template) {
      await deleteEmailTemplates({ _id: req.params.id })
      return generalResponse(res, true, 'success')
    }
    return generalResponse(res, false, { text: 'Email Template does not exists in your company' }, 'error', false, 400)
  } catch (e) {
    return generalResponse(res, e, '', 'error', false, 400)
  }
}

/** this is for test mail only */
export const sendEmailTemplateMail = async (req, res) => {
  try {
    const data = req.body
    const template = await findOneEmailTemplate({
      _id: data.templateId,
      ...(!req.body.isAutoResponderTemplatecompany ? {} : { company: req.headers.authorization.company })
    })
    if (template) {
      const { receiverEmails, senderEmail, senderName } = data
      const companyDetail = await updateCompany(
        { _id: req.headers.authorization.company },
        {
          defaultTestMailConfig: {
            senderName,
            senderEmail,
            receiver: receiverEmails
          }
        },
        { new: true }
      )
      if (receiverEmails && receiverEmails.length) {
        receiverEmails.forEach(async (email) => {
          sendMail({
            sender: senderEmail || companyDetail.email,
            senderName: senderName || companyDetail?.name,
            receiver: email,
            subject: `TEST: ${template.subject}`,
            ...(template.htmlBody && { htmlBody: template.htmlBody || '' })
          })
        })
      }
      return generalResponse(res, true, 'success')
    }
    return generalResponse(res, false, { text: 'Template does not exists in your company' }, 'error', false, 400)
  } catch (e) {
    return generalResponse(res, e, '', 'error', false, 400)
  }
}

export const sendEmailTemplate = async (req, res) => {
  try {
    const data = req.body
    const template = await findOneEmailTemplate({ _id: data.templateId, company: req.headers.authorization.company })
    const companyDetail = await findOneCompany({ _id: req.headers.authorization.company })
    if (template && companyDetail) {
      const { receiverContacts } = data
      if (receiverContacts && receiverContacts.length) {
        sendMassSMS({
          numbers: receiverContacts,
          message: template.body
        })
      }

      return generalResponse(res, true, 'success')
    }
    return generalResponse(res, false, { text: 'Template does not exists in your company' }, 'error', false, 400)
  } catch (e) {
    return generalResponse(res, e, '', 'error', false, 400)
  }
}

export const cloneEmailTemplate = async (req, res) => {
  try {
    const template = await findOneEmailTemplate({ _id: req.params.id })
    const templateDetails = JSON.parse(JSON.stringify(template))
    if (templateDetails) {
      templateDetails.name = `Copy of ${templateDetails.name}`
      templateDetails.status = true
    }
    delete templateDetails._id
    const cloneTemplateDetail = await createEmailTemplate({ ...templateDetails })

    return generalResponse(res, cloneTemplateDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const changeEmailTemplateFolderDetails = async (req, res) => {
  try {
    const { templateid, folder: folderId } = req.body

    await updateManyEmailTemplate({ _id: { $in: templateid } }, { $set: { folder: folderId } }, { multi: true })

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
