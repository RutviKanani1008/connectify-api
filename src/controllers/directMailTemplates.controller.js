import generalResponse from '../helpers/generalResponse.helper'
import { getSelectParams } from '../helpers/generalHelper'
import { ObjectId } from 'mongodb'
import { parseData } from '../utils/utils'
import { validateDirectMailTemplate } from '../models/directMailTemplate'
import {
  createDirectMailTemplate,
  deleteDirectMailTemplates,
  directMailTemplatesBulkWrite,
  findDirectMailTemplateWithAggregation,
  findDirectMailTemplateWithAggregationCount,
  findDirectMailTemplates,
  findOneDirectMailTemplate,
  updateDirectMailTemplateRepo
} from '../repositories/directMailTemplates.repository'

export const getAllDirectMailTemplatedDetails = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const q = req?.query
    if (!q.isAutoResponderTemplate) {
      q.company = currentUser.company
    }

    const templates = await findDirectMailTemplates(q, getSelectParams(req))
    return generalResponse(res, templates, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getAllDirectMailTemplates = async (req, res) => {
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

    const total = await findDirectMailTemplateWithAggregationCount({
      match
    })
    const templates = await findDirectMailTemplateWithAggregation({
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

export const getDirectMailTemplate = async (req, res) => {
  try {
    const template = await findOneDirectMailTemplate({ _id: req.params.id }, {}, [{ path: 'folder', ref: 'Folders' }])
    return generalResponse(res, template, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateDirectMailTemplate = async (req, res) => {
  try {
    const currentUser = req.headers.authorization

    const data = req.body
    data.company = req.headers.authorization.company

    const isExist = await findOneDirectMailTemplate({ name: req.body.name, company: currentUser.company })
    if (isExist && String(isExist._id) !== String(req.body._id)) {
      return generalResponse(res, false, { text: 'Template Already Exist with this name.' }, 'error', false, 400)
    }

    const isDirectMailTemplateExist = await findOneDirectMailTemplate({
      _id: req.params.id,
      company: currentUser.company
    })
    if (!isDirectMailTemplateExist) {
      return generalResponse(
        res,
        false,
        { text: 'Direct Mail Template is not Exist with this id.' },
        'error',
        false,
        400
      )
    }

    if (validateDirectMailTemplate(data) && req.params.id) {
      await updateDirectMailTemplateRepo({ _id: req.params.id }, { ...req.body })
      const updatedData = await findOneDirectMailTemplate({ _id: req.params.id })
      return generalResponse(res, updatedData, 'Direct Mail Template updated successfully!', 'success', true)
    }
    return generalResponse(res, null, 'Template Available')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const saveDirectMailTemplate = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const data = req.body
    data.company = req.headers.authorization.company
    if (validateDirectMailTemplate(data)) {
      const isExist = await findOneDirectMailTemplate({ name: req.body.name, company: currentUser.company })
      if (isExist) {
        return generalResponse(res, false, { text: 'Template Already Exist with this name.' }, 'error', false, 400)
      }

      const newDirectMailTemplate = await createDirectMailTemplate(data)
      return generalResponse(res, newDirectMailTemplate, 'Direct Mail Template created successfully!', 'success', true)
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteDirectMailTemplate = async (req, res) => {
  try {
    const template = await findOneDirectMailTemplate({ _id: req.params.id, company: req.headers.authorization.company })
    if (template) {
      await deleteDirectMailTemplates({ _id: req.params.id })
      return generalResponse(res, true, 'success')
    }
    return generalResponse(
      res,
      false,
      { text: 'Direct Mail Template does not exists in your company' },
      'error',
      false,
      400
    )
  } catch (e) {
    return generalResponse(res, e, '', 'error', false, 400)
  }
}

export const cloneDirectMailTemplate = async (req, res) => {
  try {
    const template = await findOneDirectMailTemplate({ _id: req.params.id })
    const templateDetails = JSON.parse(JSON.stringify(template))
    if (templateDetails) {
      templateDetails.name = `Copy of ${templateDetails.name}`
    }
    delete templateDetails._id
    delete templateDetails.createdAt
    delete templateDetails.updatedAt
    const cloneTemplateDetail = await createDirectMailTemplate({ ...templateDetails })
    return generalResponse(res, cloneTemplateDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateFolderOrderDirectMailTemplate = async (req, res) => {
  try {
    let data = req.body
    data = data?.map(({ _id, folder }, index) => ({
      updateOne: {
        filter: {
          _id
        },
        update: {
          order: index,
          folder
        }
      }
    }))
    const templates = await directMailTemplatesBulkWrite(data)
    return generalResponse(res, templates, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
