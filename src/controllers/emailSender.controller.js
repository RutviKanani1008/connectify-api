import { ObjectId } from 'mongodb'
import { INTERNAL_COMMUNICATION_TEMPLATE } from '../constants/internalCommunicationTemplate'
import { varSetInTemplate } from '../helpers/dynamicVarSetInTemplate.helper'
import generalResponse from '../helpers/generalResponse.helper'
import { findOneCompanyEmail } from '../repositories/companies.repository'
import {
  addEmailSenderService,
  deleteEmailSender,
  findEmailSenderService,
  findOneEmailSenderService,
  updateEmailSenderService
} from '../repositories/emailSender.repository'
import { findOneEmailTemplate } from '../repositories/emailTemplates.repository'
import { sendMail } from '../services/send-grid'

export const addEmailSender = async (req, res) => {
  try {
    const { email, company, showToast = false } = req.body
    let result = await findEmailSenderService({ email: email.toLowerCase(), company })

    if (!(result?.length > 0)) {
      /* Check Is Company Mail */
      const isCompanyEmail = await findOneCompanyEmail({ _id: ObjectId(company), email })

      if (isCompanyEmail) {
        await addEmailSenderService({ company, email, status: 'Verified' })
        result = await findEmailSenderService({ email })
      } else {
        const template = await findOneEmailTemplate({
          _id: INTERNAL_COMMUNICATION_TEMPLATE.verifyEmail
        }).select({ htmlBody: true, subject: true })

        /* Send to company admin */
        let registerTemplateBody = template.htmlBody
        const registerVarObj = {
          link: `${process.env.HOST_NAME}/verify-email?email=${btoa(email)}&company=${btoa(company)}`
        }
        registerTemplateBody = varSetInTemplate(registerVarObj, registerTemplateBody)
        sendMail({ receiver: email, subject: template.subject, htmlBody: registerTemplateBody })

        await addEmailSenderService({ company, email: email.toLowerCase() })
      }
    }
    if (result?.length > 0 && showToast) {
      return generalResponse(res, null, 'Email Already Exist.', 'error', 200)
    }
    return generalResponse(res, result, 'Add Email Successfully.', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const verifyEmailSender = async (req, res) => {
  try {
    let { email, company } = req.body
    email = atob(email)
    company = atob(company)

    console.log({ email })
    console.log({ company })

    await updateEmailSenderService({ email: email.toLowerCase(), company }, { status: 'Verified' })
    return generalResponse(res, null, 'Update Email Successfully.', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const changeEmailSenderStatus = async (req, res) => {
  try {
    const { status } = req.body
    await updateEmailSenderService({ _id: req.params.id }, { status })
    return generalResponse(res, null, 'Update Status Successfully.', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const handleDeleteEmailSender = async (req, res) => {
  try {
    await deleteEmailSender({ _id: req.params.id })
    return generalResponse(res, null, 'Update Email Successfully.', 'success')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSenderEmail = async (req, res) => {
  try {
    // const currentUser = req.headers.authorization
    const result = await findEmailSenderService({ company: req.query.company, ...req.query })
    return generalResponse(res, result, 'Fetch Email Successfully.', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const reSendEmail = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const { email } = req.body
    const result = await findOneEmailSenderService({ email, company: currentUser?.company })
    if (result) {
      const template = await findOneEmailTemplate({
        _id: INTERNAL_COMMUNICATION_TEMPLATE.verifyEmail
      }).select({ htmlBody: true, subject: true })
      let registerTemplateBody = template.htmlBody
      const registerVarObj = {
        link: `${process.env.HOST_NAME}/verify-email?email=${btoa(email)}&company=${btoa(currentUser?.company)}`
      }
      registerTemplateBody = varSetInTemplate(registerVarObj, registerTemplateBody)
      sendMail({ receiver: email, subject: template.subject, htmlBody: registerTemplateBody })
    }
    return generalResponse(res, null, 'Verification mail send Successfully.', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
