import { ObjectId } from 'mongodb'
import { getSelectParams } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import { billingTemplateTypes } from '../models/billingTemplate'
import {
  createBillingTemplate,
  findBillingTemplates,
  findSpecificBillingTemplate,
  removeBillingTemplate,
  updateBillingTemplateById
} from '../repositories/billingTemplate.repository'

export const getTermsTemplates = async (req, res) => {
  try {
    const { company } = req.headers.authorization
    const templateType = billingTemplateTypes.TERMS_AND_CONDITION

    const templates = await findBillingTemplates({ company, type: templateType }, getSelectParams(req))

    return generalResponse(res, templates, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const addTermsTemplate = async (req, res) => {
  try {
    const { name, content } = req.body
    const { company } = req.headers.authorization
    const templateType = billingTemplateTypes.TERMS_AND_CONDITION

    if (!name) return generalResponse(res, false, { text: 'Template name is required.' }, 'error', false, 400)

    if (!content) return generalResponse(res, false, { text: 'Content is required.' }, 'error', false, 400)

    const isExist = await findSpecificBillingTemplate({ name, company, type: templateType })

    if (isExist) {
      return generalResponse(res, false, { text: 'Template Already Exist with this name.' }, 'error', false, 400)
    }

    const template = await createBillingTemplate({ company, name, content, type: templateType })

    return generalResponse(res, template, 'Template created successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getTermsTemplateById = async (req, res) => {
  try {
    const { id } = req.params
    const { company } = req.headers.authorization
    const templateType = billingTemplateTypes.TERMS_AND_CONDITION

    const template = await findSpecificBillingTemplate({ _id: ObjectId(id), company, type: templateType })

    return generalResponse(res, template, 'Template fetch successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const cloneTermsTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const { company } = req.headers.authorization
    const templateType = billingTemplateTypes.TERMS_AND_CONDITION

    const template = await findSpecificBillingTemplate({ _id: id, company, templateType })

    if (!template) return generalResponse(res, false, { text: 'Template not exist.' }, 'error', false, 400)

    const templateDetails = { company, name: `Copy of ${template.name}`, content: template.content, type: templateType }

    const cloneTemplateDetail = await createBillingTemplate(templateDetails)

    return generalResponse(res, cloneTemplateDetail, 'Template Cloned successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateTermsTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const { name, content } = req.body
    const { company } = req.headers.authorization
    const templateType = billingTemplateTypes.TERMS_AND_CONDITION

    const template = await findSpecificBillingTemplate({ _id: id, company, type: templateType })

    if (!template) return generalResponse(res, false, { text: 'Template not exist.' }, 'error', false, 400)

    if (!name) return generalResponse(res, false, { text: 'Template name is required.' }, 'error', false, 400)

    if (!content) return generalResponse(res, false, { text: 'Content is required.' }, 'error', false, 400)

    await updateBillingTemplateById({ _id: id }, { name, content })

    return generalResponse(res, null, 'Template updated successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteTermsTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const { company } = req.headers.authorization
    const templateType = billingTemplateTypes.TERMS_AND_CONDITION

    const template = await findSpecificBillingTemplate({ _id: id, company, type: templateType })

    if (!template) return generalResponse(res, false, { text: 'Template not exist.' }, 'error', false, 400)

    await removeBillingTemplate({ _id: id })

    return generalResponse(res, null, 'Template removed successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
