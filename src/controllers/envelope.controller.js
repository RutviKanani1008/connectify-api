import generalResponse from '../helpers/generalResponse.helper'
import { getSelectParams } from '../helpers/generalHelper'
import { ObjectId } from 'mongodb'
import { parseData } from '../utils/utils'
import { validateEnvelope } from '../models/envelope'
import {
  createEnvelope,
  deleteEnvelopeRepo,
  findEnvelopeWithAggregation,
  findEnvelopeWithAggregationCount,
  findOneEnvelope,
  updateEnvelopeRepo
} from '../repositories/envelope.repository'

export const getAllEnvelopes = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company: companyId } = currentUser
    let { limit = 10, page = 1, search = '', sort, type } = req.query
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

    const match = { ...($and.length ? { $and } : {}), type }

    const total = await findEnvelopeWithAggregationCount({
      match
    })
    const templates = await findEnvelopeWithAggregation({
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

export const getEnvelope = async (req, res) => {
  try {
    const template = await findOneEnvelope({ _id: req.params.id }, getSelectParams(req))
    return generalResponse(res, template, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateEnvelope = async (req, res) => {
  try {
    const currentUser = req.headers.authorization

    const data = req.body
    data.company = req.headers.authorization.company

    const isExist = await findOneEnvelope({ name: req.body.name, company: currentUser.company })
    if (isExist && String(isExist._id) !== String(req.body._id)) {
      return generalResponse(res, false, { text: ' Already Exist with this name.' }, 'error', false, 400)
    }

    const isEnvelopeExist = await findOneEnvelope({
      _id: req.params.id,
      company: currentUser.company
    })
    if (!isEnvelopeExist) {
      return generalResponse(res, false, { text: 'Envelope  is not Exist with this id.' }, 'error', false, 400)
    }

    if (validateEnvelope(data) && req.params.id) {
      await updateEnvelopeRepo({ _id: req.params.id }, { ...req.body })
      const updatedData = await findOneEnvelope({ _id: req.params.id })
      return generalResponse(res, updatedData, 'Envelope  updated successfully!', 'success', true)
    }
    return generalResponse(res, null, ' Available')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const saveEnvelope = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const data = req.body
    data.company = req.headers.authorization.company
    if (validateEnvelope(data)) {
      const isExist = await findOneEnvelope({ name: req.body.name, company: currentUser.company })
      if (isExist) {
        return generalResponse(res, false, { text: ' Already Exist with this name.' }, 'error', false, 400)
      }

      const newEnvelope = await createEnvelope(data)
      return generalResponse(res, newEnvelope, 'Envelope  created successfully!', 'success', true)
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteEnvelope = async (req, res) => {
  try {
    const template = await findOneEnvelope({ _id: req.params.id, company: req.headers.authorization.company })
    if (template) {
      await deleteEnvelopeRepo({ _id: req.params.id })
      return generalResponse(res, true, 'success')
    }
    return generalResponse(res, false, { text: 'Envelope  does not exists in your company' }, 'error', false, 400)
  } catch (e) {
    return generalResponse(res, e, '', 'error', false, 400)
  }
}

export const cloneEnvelope = async (req, res) => {
  try {
    const template = await findOneEnvelope({ _id: req.params.id })
    const templateDetails = JSON.parse(JSON.stringify(template))
    if (templateDetails) {
      templateDetails.name = `Copy of ${templateDetails.name}`
    }
    delete templateDetails._id
    delete templateDetails.createdAt
    delete templateDetails.updatedAt
    const cloneDetail = await createEnvelope({ ...templateDetails })
    return generalResponse(res, cloneDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
