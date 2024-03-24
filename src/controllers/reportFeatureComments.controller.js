import { ObjectId } from 'mongodb'
import { getSelectParams } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import {
  createComment,
  deleteComment,
  findAllComments,
  updateComment
} from '../repositories/reportFeatureComments.repository'
import { getReportProblem } from '../repositories/reportProblem.repository'
import { getFeatureRequest } from '../repositories/featureRequest.repository'
import { sendMail } from '../services/send-grid'
import { varSetInTemplate } from '../helpers/dynamicVarSetInTemplate.helper'
import { findOneEmailTemplate } from '../repositories/emailTemplates.repository'
import { INTERNAL_COMMUNICATION_TEMPLATE } from '../constants/internalCommunicationTemplate'
import { findUser } from '../repositories/users.repository'

export const getAllReportFeatureComments = async (req, res) => {
  const { itemId } = req.params
  const { modelName, ...rest } = req.query

  if (!(modelName === 'ReportProblem' || modelName === 'FeatureRequest')) {
    return generalResponse(res, null, 'Invalid comments model', 'error', false, 400)
  }

  const moduleId = modelName === 'FeatureRequest' ? 'featureRequestId' : 'reportProblemId'

  const allComments = await findAllComments({
    params: { [moduleId]: ObjectId(itemId), ...rest },
    projection: getSelectParams(req),
    sort: { createdAt: 1 },
    populate: [{ path: 'commentedBy', select: 'firstName lastName' }]
  })
  return generalResponse(res, allComments, 'Comment fetched successfully!', 'success', false)
}

export const addReportFeatureComment = async (req, res) => {
  try {
    const { itemId } = req.params
    const { message, modelName } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const isSuperAdmin = currentUser?.role === 'superadmin'

    if (!(modelName === 'ReportProblem' || modelName === 'FeatureRequest')) {
      return generalResponse(res, null, 'Invalid comments model', 'error', false, 400)
    }

    let newComment = null

    if (modelName === 'ReportProblem') {
      const reportedProblem = await getReportProblem({ _id: ObjectId(itemId) })

      if (!reportedProblem) {
        return generalResponse(res, null, 'Invalid itemId', 'error', false, 400)
      }

      newComment = await createComment({
        reportProblemId: ObjectId(itemId),
        message,
        commentedBy: currentUser._id
      })

      reportedProblem.comments.push(newComment)
      await reportedProblem.save()

      /* Send Mail on comment added */
      const superAdminUser = await findUser({ role: 'superadmin' })

      const replyUserEmail = isSuperAdmin ? reportedProblem.email : superAdminUser.email
      const replyUserName = isSuperAdmin
        ? `${reportedProblem?.firstName} ${reportedProblem?.lastName}`
        : `${superAdminUser?.firstName} ${superAdminUser?.lastName}`

      const reportReqTemplate = await findOneEmailTemplate({
        _id: INTERNAL_COMMUNICATION_TEMPLATE.reportProblemCommentAdded
      }).select({ htmlBody: true, subject: true })

      const reportReqVarObj = {
        name: replyUserName,
        confirmationNumber: reportedProblem.id,
        comment: message,
        link: `${process.env.HOST_NAME}/report-problem?comment=true&id=${reportedProblem._id}`
      }
      const autoResReportSubject = reportReqTemplate.subject?.replace('{{confirmationNumber}}', reportedProblem.id)
      const reportReqTemplateHtmlBody = varSetInTemplate(reportReqVarObj, reportReqTemplate.htmlBody)

      sendMail({
        receiver: replyUserEmail,
        subject: autoResReportSubject,
        htmlBody: reportReqTemplateHtmlBody
      })
    } else {
      const featureRequest = await getFeatureRequest({ _id: ObjectId(itemId) })

      if (!featureRequest) {
        return generalResponse(res, null, 'Invalid itemId', 'error', false, 400)
      }

      newComment = await createComment({
        featureRequestId: ObjectId(itemId),
        message,
        commentedBy: currentUser._id
      })

      featureRequest.comments.push(newComment)
      await featureRequest.save()

      /* Send Mail on comment added */
      const superAdminUser = await findUser({ role: 'superadmin' })

      const replyUserEmail = isSuperAdmin ? featureRequest.email : superAdminUser.email
      const replyUserName = isSuperAdmin
        ? `${featureRequest?.firstName} ${featureRequest?.lastName}`
        : `${superAdminUser?.firstName} ${superAdminUser?.lastName}`

      const featureReqTemplate = await findOneEmailTemplate({
        _id: INTERNAL_COMMUNICATION_TEMPLATE.featureRequestCommentAdded
      }).select({ htmlBody: true, subject: true })

      const featureReqVarObj = {
        name: replyUserName,
        confirmationNumber: featureRequest.id,
        comment: message,
        link: `${process.env.HOST_NAME}/feature-request?comment=true&id=${featureRequest._id}`
      }

      const featureReqSubject = featureReqTemplate.subject?.replace('{{confirmationNumber}}', featureRequest.id)
      const featureReqTemplateHtmlBody = varSetInTemplate(featureReqVarObj, featureReqTemplate.htmlBody)

      sendMail({
        receiver: replyUserEmail,
        subject: featureReqSubject,
        htmlBody: featureReqTemplateHtmlBody
      })
    }

    return generalResponse(res, newComment, 'Comment added successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 500)
  }
}
export const editReportFeatureComment = async (req, res) => {
  try {
    const { id } = req.params
    await updateComment({ _id: id }, req.body)
    return generalResponse(res, null, 'Comment updated successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 500)
  }
}
export const deleteReportFeatureComment = async (req, res) => {
  try {
    await deleteComment({ _id: req.params.id })
    return generalResponse(res, null, 'Comment deleted successfully!', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 500)
  }
}
