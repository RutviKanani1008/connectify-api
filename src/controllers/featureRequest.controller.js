import { ObjectId } from 'mongodb'
import generalResponse from '../helpers/generalResponse.helper'
import { getSelectParams } from '../helpers/generalHelper'
import {
  countFeatureRequest,
  findAllFeatureRequests,
  getFeatureRequest,
  removeFeatureRequestById,
  updateFeatureRequest
} from '../repositories/featureRequest.repository'
import { varSetInTemplate } from '../helpers/dynamicVarSetInTemplate.helper'
import { sendMail } from '../services/send-grid'
import { findOneEmailTemplate } from '../repositories/emailTemplates.repository'
import { INTERNAL_COMMUNICATION_TEMPLATE } from '../constants/internalCommunicationTemplate'

export const getAllFeatureRequests = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const isSuperAdmin = currentUser?.role === 'superadmin'

    const { search = '', page = 1, limit = 10 } = req.query
    const skip = limit * (page - 1)

    const projection = getSelectParams(req)

    let where = {}

    if (!isSuperAdmin) {
      where.userId = ObjectId(currentUser._id)
    }

    if (search) {
      const reg = new RegExp(search, 'i')
      const searchVal = {
        $or: [{ firstName: { $regex: reg } }, { lastName: { $regex: reg } }, { requestMessage: { $regex: reg } }]
      }
      where = { ...where, ...searchVal }
    }

    const featureRequests = await findAllFeatureRequests(where, projection, { skip, limit }, undefined, [
      {
        path: 'comments',
        model: 'ReportProblemComment',
        select: '_id commentedBy'
      },
      { path: 'company', select: 'name' }
    ])
    const totalRecords = await countFeatureRequest(where)

    return generalResponse(res, { featureRequests, total: totalRecords }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateReadNewFeatureRequests = async (req, res) => {
  const ids = req.body.featureRequestIds
  await updateFeatureRequest({ _id: { $in: ids.map((id) => ObjectId(id)) } }, { isNew: false })
  return generalResponse(res, null, 'success')
}

export const updateFeatureRequestById = async (req, res) => {
  const { id } = req.params
  const featureRequest = await getFeatureRequest({ _id: ObjectId(id) })
  await updateFeatureRequest({ _id: ObjectId(id) }, req.body)

  const isStatusUpdate = req.body.status && featureRequest.status !== req.body.status

  /* Send Mail on status update */
  if (isStatusUpdate) {
    const autoResReportTemplate = await findOneEmailTemplate({
      _id: INTERNAL_COMMUNICATION_TEMPLATE.featureRequestStatusUpdate
    }).select({ htmlBody: true, subject: true })

    const mappedStatus = {
      Pending: 'In Queue',
      InProgress: 'In Progress',
      Done: 'Done'
    }

    const autoResReportReqVarObj = {
      name: `${featureRequest?.firstName} ${featureRequest?.lastName}`,
      confirmationNumber: featureRequest.id,
      status: mappedStatus[req.body.status],
      link: `${process.env.HOST_NAME}/feature-request?id=${featureRequest._id}`
    }
    const autoResReportSubject = autoResReportTemplate.subject?.replace('{{confirmationNumber}}', featureRequest.id)
    const autoResReportTemplateHtmlBody = varSetInTemplate(autoResReportReqVarObj, autoResReportTemplate.htmlBody)

    sendMail({
      receiver: featureRequest.email,
      subject: autoResReportSubject,
      htmlBody: autoResReportTemplateHtmlBody
    })
  }

  return generalResponse(res, null, 'success')
}

export const deleteFeatureRequest = async (req, res) => {
  try {
    const status = await removeFeatureRequestById({ _id: ObjectId(req.params.id) })
    if (status && status.acknowledged && status.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Feature Request Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getFeatureRequestById = async (req, res) => {
  try {
    const projection = getSelectParams(req)

    const featureRequest = await getFeatureRequest({ _id: ObjectId(req.params.id) }, projection, [
      {
        path: 'comments',
        model: 'ReportProblemComment',
        select: '_id commentedBy'
      }
    ])
    if (featureRequest) {
      return generalResponse(res, featureRequest, null, 'success', false, 200)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
