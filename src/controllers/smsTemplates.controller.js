import generalResponse from '../helpers/generalResponse.helper'
import { validateContact } from '../models/contacts'
import {
  createSmsTemplate,
  deleteSmsTemplates,
  findOneSmsTemplate,
  findSmsTemplateWithAggregation,
  findSmsTemplateWithAggregationCount,
  findSmsTemplates,
  updateSmsTemplate
} from '../repositories/smsTemplates.repository'
import { findOneCompany } from '../repositories/companies.repository'
import { sendMail } from '../services/send-grid'
import { getSelectParams } from '../helpers/generalHelper'
import { sendMassSMS } from '../services/sms/sendSms'
import { parseData } from '../utils/utils'
import { ObjectId } from 'mongodb'

export const getSmsTemplates = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const q = req?.query
    q.company = currentUser.company
    const templates = await findSmsTemplates(q, getSelectParams(req))
    return generalResponse(res, templates, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const listSmsTemplates = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company: companyId } = currentUser
    let { limit = 10, page = 1, search = '', sort } = req.query
    const project = { ...getSelectParams(req) }
    const skip = Number(limit) * Number(page) - Number(limit)
    sort = parseData(sort)

    const $and = [{ company: ObjectId(companyId) }]

    if (search) {
      const reg = new RegExp(search, 'i')
      $and.push({
        $or: [{ name: { $regex: reg } }, { body: { $regex: reg } }]
      })
    }

    const match = { ...($and.length ? { $and } : {}) }

    const total = await findSmsTemplateWithAggregationCount({
      match
    })
    const templates = await findSmsTemplateWithAggregation({
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

export const checkSmsTemplateAlreadyExist = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const { name } = req.body

    if (!name) {
      return generalResponse(res, false, { text: 'Template name is required.' }, 'error', false, 400)
    }

    const isExist = await findOneSmsTemplate({ name, company: currentUser.company })
    if (isExist) {
      return generalResponse(res, false, { text: 'Template Already Exist with this name.' }, 'error', false, 400)
    }

    return generalResponse(res, null, 'Template Available')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const saveSmsTemplate = async (req, res) => {
  try {
    const data = req.body
    data.company = req.headers.authorization.company
    let saved = null
    if (validateContact(data)) {
      if (data._id) {
        const { name, subject, body, htmlBody, jsonBody, _id } = data
        await updateSmsTemplate({ _id }, { name, subject, body, htmlBody, jsonBody })
        saved = await findOneSmsTemplate({ _id })
        return generalResponse(res, saved, 'Template updated successfully!', 'success', true)
      } else {
        saved = await createSmsTemplate(data)
        return generalResponse(res, saved, 'Template created successfully!', 'success', true)
      }
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteSmsTemplate = async (req, res) => {
  try {
    const template = await findOneSmsTemplate({ _id: req.params.id, company: req.headers.authorization.company })
    if (template) {
      await deleteSmsTemplates({ _id: req.params.id })
      return generalResponse(res, true, 'success')
    }
    return generalResponse(res, false, { text: 'Sms Template does not exists in your company' }, 'error', false, 400)
  } catch (e) {
    return generalResponse(res, e, '', 'error', false, 400)
  }
}

export const sendSmsTemplateMail = async (req, res) => {
  try {
    const data = req.body
    const template = await findOneSmsTemplate({ _id: data.templateId, company: req.headers.authorization.company })
    const companyDetail = await findOneCompany({ _id: req.headers.authorization.company })
    if (template && companyDetail) {
      const { receiverEmails } = data
      if (receiverEmails && receiverEmails.length) {
        receiverEmails.forEach(async (email) => {
          sendMail({
            sender: companyDetail.email,
            receiver: email,
            subject: template.subject,
            htmlBody: template.htmlBody
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

export const sendSmsTemplate = async (req, res) => {
  try {
    const data = req.body
    const template = await findOneSmsTemplate({ _id: data.templateId, company: req.headers.authorization.company })
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

export const cloneSmsTemplate = async (req, res) => {
  try {
    const template = await findOneSmsTemplate({ _id: req.params.id })
    const templateDetails = JSON.parse(JSON.stringify(template))
    if (templateDetails) {
      templateDetails.name = `Copy of ${templateDetails.name}`
      templateDetails.status = true
    }
    delete templateDetails._id
    const cloneTemplateDetail = await createSmsTemplate({ ...templateDetails })

    return generalResponse(res, cloneTemplateDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
