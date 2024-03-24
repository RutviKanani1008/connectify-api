import { ObjectId } from 'mongodb'
import generalResponse from '../helpers/generalResponse.helper'
import { getSelectParams } from '../helpers/generalHelper'
import {
  findAllReportProblems,
  getReportProblem,
  removeReportProblemById,
  reportProblemCount,
  updateReportProblem
} from '../repositories/reportProblem.repository'
import { findOneEmailTemplate } from '../repositories/emailTemplates.repository'
import { INTERNAL_COMMUNICATION_TEMPLATE } from '../constants/internalCommunicationTemplate'
import { varSetInTemplate } from '../helpers/dynamicVarSetInTemplate.helper'
import { sendMail } from '../services/send-grid'

export const getAllReportProblems = async (req, res) => {
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
        $or: [{ firstName: { $regex: reg } }, { lastName: { $regex: reg } }, { body: { $regex: reg } }]
      }
      where = { ...where, ...searchVal }
    }

    const reportProblems = await findAllReportProblems(where, projection, { skip, limit }, undefined, [
      {
        path: 'comments',
        model: 'ReportProblemComment',
        select: '_id commentedBy'
      },
      { path: 'company', select: 'name' }
    ])
    const totalRecords = await reportProblemCount(where)

    return generalResponse(res, { reportProblems, total: totalRecords }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateReadNewReportProblems = async (req, res) => {
  const ids = req.body.reportProblemIds
  await updateReportProblem({ _id: { $in: ids.map((id) => ObjectId(id)) } }, { isNew: false })
  return generalResponse(res, null, 'success')
}

export const updateReportProblemById = async (req, res) => {
  const { id } = req.params
  const reportProblem = await getReportProblem({ _id: ObjectId(id) })
  await updateReportProblem({ _id: ObjectId(id) }, req.body)

  const isStatusUpdate = req.body.status && reportProblem.status !== req.body.status

  /* Send Mail on status update */
  if (isStatusUpdate) {
    const autoResReportTemplate = await findOneEmailTemplate({
      _id: INTERNAL_COMMUNICATION_TEMPLATE.reportProblemStatusUpdate
    }).select({ htmlBody: true, subject: true })

    const mappedStatus = {
      Pending: 'In Queue',
      InProgress: 'In Progress',
      Done: 'Done'
    }

    const autoResReportReqVarObj = {
      name: `${reportProblem?.firstName} ${reportProblem?.lastName}`,
      confirmationNumber: reportProblem.id,
      status: mappedStatus[req.body.status],
      link: `${process.env.HOST_NAME}/report-problem?id=${reportProblem._id}`
    }
    const autoResReportSubject = autoResReportTemplate.subject?.replace('{{confirmationNumber}}', reportProblem.id)
    const autoResReportTemplateHtmlBody = varSetInTemplate(autoResReportReqVarObj, autoResReportTemplate.htmlBody)

    sendMail({
      receiver: reportProblem.email,
      subject: autoResReportSubject,
      htmlBody: autoResReportTemplateHtmlBody
    })
  }

  return generalResponse(res, null, 'success')
}

export const deleteReportProblem = async (req, res) => {
  try {
    const status = await removeReportProblemById({ _id: ObjectId(req.params.id) })
    if (status && status.acknowledged && status.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Feature Request Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getReportProblemById = async (req, res) => {
  try {
    const projection = getSelectParams(req)

    const reportedProblem = await getReportProblem({ _id: ObjectId(req.params.id) }, projection, [
      {
        path: 'comments',
        model: 'ReportProblemComment',
        select: '_id commentedBy'
      }
    ])
    if (reportedProblem) {
      return generalResponse(res, reportedProblem, null, 'success', false, 200)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
