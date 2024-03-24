/* eslint-disable no-unused-vars */
// ==================== Packages =======================
import path from 'path'
import ejs from 'ejs'
// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import { createContactUs } from '../repositories/contactUs.repository'
import { countFeatureRequest, createFeatureRequest } from '../repositories/featureRequest.repository'
import { createReportProblem, reportProblemCount } from '../repositories/reportProblem.repository'
import { sendMail } from '../services/send-grid'
import { findUser } from '../repositories/users.repository'
import { INTERNAL_COMMUNICATION_TEMPLATE } from '../constants/internalCommunicationTemplate'
import { findOneEmailTemplate } from '../repositories/emailTemplates.repository'
import { varSetInTemplate } from '../helpers/dynamicVarSetInTemplate.helper'
import AWS from 'aws-sdk'
import { deleteAttachmentFromWasabi } from '../middlewares/fileUploader'
import _ from 'lodash'

export const contactUs = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const dataObj = { ...req.body, userId: currentUser._id }
    await createContactUs(dataObj)
    const user = await findUser({ role: 'superadmin' })
    const __dirname = path.resolve()

    const body = await ejs.renderFile(path.join(__dirname, '/src/views/inquiry.ejs'), {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      email: req.body.email,
      message: req.body.message
    })
    await sendMail({ receiver: user.email, subject: 'BT CRM Software : General Inquiry', htmlBody: body })
    return generalResponse(res, '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const featureRequest = async (req, res) => {
  try {
    let currentUser = null
    if (req.headers?.authorization) {
      currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    }
    const dataObj = { ...req.body, userId: currentUser?._id || null }
    const totalFeatureRequest = await countFeatureRequest()
    const total =
      totalFeatureRequest + 1 < 10
        ? `00${totalFeatureRequest + 1}`
        : totalFeatureRequest + 1 < 100
        ? `0${totalFeatureRequest + 1}`
        : `${totalFeatureRequest + 1}`
    const featureRequest = await createFeatureRequest({
      ...dataObj,
      id: `FR${total}`,
      company: currentUser?.company || null
    })

    const user = await findUser({ role: 'superadmin' })

    const featureRequestTemplate = await findOneEmailTemplate({
      _id: INTERNAL_COMMUNICATION_TEMPLATE.featureRequest
    }).select({ htmlBody: true, subject: true })

    let featureRequestTemplateBody = featureRequestTemplate.htmlBody

    const featureReqVarObj = {
      firstName: req.body?.firstName || '',
      lastName: req.body?.lastName || '',
      confirmationNumber: `FR${total}`,
      phone: req.body.phone,
      email: req.body.email,
      message: req.body.requestMessage,
      link: `${process.env.HOST_NAME}/feature-request?id=${featureRequest._id}`
    }
    featureRequestTemplateBody = varSetInTemplate(featureReqVarObj, featureRequestTemplateBody)

    sendMail({
      // receiver: 'testuser@mailinator.com',
      receiver: user?.email,
      subject: featureRequestTemplate.subject,
      htmlBody: featureRequestTemplateBody
    })

    const autoResFeatRequestTemplate = await findOneEmailTemplate({
      _id: INTERNAL_COMMUNICATION_TEMPLATE.autoResponderFeatureRequest
    }).select({ htmlBody: true, subject: true })
    let autoResFeatTemplateHtmlBody = autoResFeatRequestTemplate.htmlBody

    const autoResFeatureReqVarObj = {
      name: `${req.body?.firstName} ${req.body?.lastName}`,
      confirmationNumber: `FR${total}`,
      message: req.body.requestMessage,
      link: `${process.env.HOST_NAME}/feature-request?id=${featureRequest._id}`
    }
    autoResFeatTemplateHtmlBody = varSetInTemplate(autoResFeatureReqVarObj, autoResFeatTemplateHtmlBody)

    sendMail({
      receiver: req.body.email,
      subject: autoResFeatRequestTemplate.subject,
      htmlBody: autoResFeatTemplateHtmlBody
    })

    // remove attachments from s3
    const { removeAttachments = [] } = req.body
    if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
      await deleteAttachmentFromWasabi(removeAttachments)
    }

    return generalResponse(res, '', 'success')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const sendrequestFileUpload = async (req, res) => {
  try {
    const { socketInstance } = req
    if (req?.files?.length) {
      const filePaths = req.files.map((file) => file.key)
      socketInstance && socketInstance.emit('uploadProgress', 100)
      return generalResponse(res, filePaths, 'success')
    } else {
      throw new Error('')
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const reportProblem = async (req, res) => {
  try {
    const s3 = new AWS.S3({
      endpoint: `s3.${process.env.WASABI_REGION}.wasabisys.com`,
      region: process.env.WASABI_REGION,
      accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
      secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY
    })
    let currentUser = null
    if (req?.headers?.authorization) {
      currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    }
    const dataObj = { ...req.body, userId: currentUser?._id || null }
    const totalReport = await reportProblemCount()

    const total =
      totalReport + 1 < 10
        ? `00${totalReport + 1}`
        : totalReport + 1 < 100
        ? `0${totalReport + 1}`
        : `${totalReport + 1}`

    const reportedProblem = await createReportProblem({
      ...dataObj,
      id: `RP${total}`,
      company: currentUser?.company || null
    })

    const user = await findUser({ role: 'superadmin' })

    const reportProbTemplate = await findOneEmailTemplate({
      _id: INTERNAL_COMMUNICATION_TEMPLATE.reportProblem
    }).select({ htmlBody: true, subject: true })
    let reportProbTemplateBody = reportProbTemplate.htmlBody

    const reportProbVarObj = {
      firstName: req.body?.firstName || '',
      lastName: req.body?.lastName || '',
      confirmationNumber: `FR${total}`,
      phone: req.body.phone,
      email: req.body.email,
      message: req.body.body,
      link: `${process.env.HOST_NAME}/report-problem?id=${reportedProblem._id}`
    }
    reportProbTemplateBody = varSetInTemplate(reportProbVarObj, reportProbTemplateBody)

    const attachments = []
    if (req.body.uploadFileURL?.length) {
      Promise.all([
        ...req.body.uploadFileURL?.map(async (attachment) => {
          const options = {
            Bucket: process.env.WASABI_BUCKET_NAME,
            Key: attachment?.fileUrl
          }
          const data = await s3.getObject(options).promise()
          attachments.push({
            content: data?.Body?.toString('base64'),
            filename: attachment?.fileName
          })
        })
      ]).then(() => {
        sendMail({
          // receiver: 'testuser@mailinator.com',
          receiver: user?.email,
          // cc: ['developer@mailinator.com'],
          subject: reportProbTemplate.subject,
          htmlBody: reportProbTemplateBody,
          attachments
        })
      })
    } else {
      sendMail({
        // receiver: 'testuser@mailinator.com',
        receiver: user?.email,
        // cc: ['developer@mailinator.com'],
        subject: reportProbTemplate.subject,
        htmlBody: reportProbTemplateBody,
        attachments
      })
    }

    const autoResReportTemplate = await findOneEmailTemplate({
      _id: INTERNAL_COMMUNICATION_TEMPLATE.autoResponderReportProblem
    }).select({ htmlBody: true, subject: true })
    let autoResReportTemplateHtmlBody = autoResReportTemplate.htmlBody

    const autoResReportReqVarObj = {
      name: `${req.body?.firstName} ${req.body?.lastName}`,
      confirmationNumber: `RP${total}`,
      message: req.body.body,
      link: `${process.env.HOST_NAME}/report-problem?id=${reportedProblem._id}`
    }
    autoResReportTemplateHtmlBody = varSetInTemplate(autoResReportReqVarObj, autoResReportTemplateHtmlBody)

    sendMail({
      receiver: req.body.email,
      subject: autoResReportTemplate.subject,
      htmlBody: autoResReportTemplateHtmlBody
    })

    // remove attachments from s3
    const { removeAttachments = [] } = req.body
    if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
      await deleteAttachmentFromWasabi(removeAttachments)
    }

    return generalResponse(res, '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}
