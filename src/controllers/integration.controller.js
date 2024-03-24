import generalResponse from '../helpers/generalResponse.helper'
import { createIntegration, findIntegration, updateIntegration } from '../repositories/integrations.repository'
import { ObjectId } from 'mongodb'
import sgClient from '@sendgrid/client'
import twilio from 'twilio'
import nodemailer from 'nodemailer'

export const addIntegrationDetail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { sendGrid, twilioKey } = req.body

    if (twilioKey) {
      try {
        const twilioClient = twilio(twilioKey.accountSid, twilioKey.authToken)
        await twilioClient.notify.services(twilioKey.notifyServiceSID).fetch()
      } catch (error) {
        return generalResponse(res, false, 'Invalid twilio service', 'error', true, 400)
      }
    }

    if (sendGrid && sendGrid?.apiKey) {
      try {
        sgClient.setApiKey(sendGrid?.apiKey)
        const request = {
          url: '/v3/scopes',
          method: 'GET'
        }
        const [, body] = await sgClient.request(request)
        if (body.scopes.includes('mail.send')) {
          const integration = await createIntegration({ ...req.body, company: currentUser?.company })
          return generalResponse(res, integration, 'success')
        } else {
          return generalResponse(res, false, 'Invalid sendgrid scope', 'error', true, 400)
        }
      } catch (err) {
        return generalResponse(res, false, 'Invalid api key', 'error', true, 400)
      }
    }

    return generalResponse(res, false, 'Twilio / Sendgrid detail is required', 'error', true, 400)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getIntegrationDetails = async (req, res) => {
  try {
    const integration = await findIntegration(req.query)
    return generalResponse(res, integration, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateIntegrationDetail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { sendGrid, twilioKey } = req.body

    if (twilioKey) {
      try {
        const twilioClient = twilio(twilioKey.accountSid, twilioKey.authToken)
        await twilioClient.notify.services(twilioKey.notifyServiceSID).fetch()
      } catch (error) {
        return generalResponse(res, false, `Twilio error : ${error?.message} `, 'error', true, 400)
      }
    }
    if (sendGrid && sendGrid?.apiKey) {
      try {
        sgClient.setApiKey(sendGrid?.apiKey)
        const request = {
          url: '/v3/scopes',
          method: 'GET'
        }
        const [, body] = await sgClient.request(request)
        if (body.scopes.includes('mail.send')) {
          const updateStatus = await updateIntegration(
            { _id: ObjectId(req.params.id), company: ObjectId(currentUser?.company) },
            req.body
          )
          if (updateStatus && updateStatus.matchedCount === 0) {
            return generalResponse(res, false, 'No Api key found.', 'error', true, 400)
          }
          const integration = await findIntegration({ _id: req.params.id })
          return generalResponse(res, integration, 'success')
        } else {
          return generalResponse(res, false, 'Invalid scope', 'error', true, 400)
        }
      } catch (err) {
        return generalResponse(res, false, 'Invalid api key', 'error', true, 400)
      }
    }
    return generalResponse(res, false, 'Sendgrid api key is required', 'error', true, 400)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addSmtpConfig = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const {
      smtpConfig: { host, port, secured, username, password }
    } = req.body

    if (host && port && secured != null && username && password) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: secured,
          auth: {
            user: username,
            pass: password
          }
        })
        const verified = await transporter.verify()
        if (!verified) return generalResponse(res, false, 'smtp verification failed', 'error', true, 400)
        const integration = await createIntegration({
          ...req.body,
          company: currentUser?.company
        })
        return generalResponse(res, integration, 'success', 'success', true, 200)
      } catch (err) {
        console.log(err, 'err')
        return generalResponse(res, false, 'Error verifying smtp credentials', 'error', true, 400)
      }
    }

    return generalResponse(res, false, 'SMTP credentials are required', 'error', true, 400)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateSmtpConfig = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { smtpConfig } = req.body

    if (smtpConfig) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secured,
          auth: {
            user: smtpConfig.username,
            pass: smtpConfig.password
          }
        })
        const verified = await transporter.verify()
        if (!verified) return generalResponse(res, false, 'smtp verification failed', 'error', true, 400)
        const updateStatus = await updateIntegration(
          { _id: ObjectId(req.params.id), company: ObjectId(currentUser?.company) },
          { ...req.body }
        )
        if (updateStatus && updateStatus.matchedCount === 0) {
          return generalResponse(res, false, 'No record found.', 'error', true, 400)
        }
        const integration = await findIntegration({
          _id: ObjectId(req.params.id),
          company: ObjectId(currentUser?.company)
        })
        return generalResponse(res, integration, 'success', 'success', true, 200)
      } catch (err) {
        console.log(err, 'err')
        return generalResponse(res, false, 'Error verifying smtp credentials', 'error', true, 400)
      }
    }

    return generalResponse(res, false, 'SMTP credentials are required', 'error', true, 400)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addSendgridConfig = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { sendGrid } = req.body

    if (sendGrid && sendGrid?.apiKey) {
      try {
        sgClient.setApiKey(sendGrid?.apiKey)
        const request = {
          url: '/v3/scopes',
          method: 'GET'
        }
        const [, body] = await sgClient.request(request)
        if (body.scopes.includes('mail.send')) {
          const integration = await createIntegration({ ...req.body, company: currentUser?.company })
          return generalResponse(res, integration, 'success')
        } else {
          return generalResponse(res, false, 'Invalid sendgrid scope', 'error', true, 400)
        }
      } catch (err) {
        return generalResponse(res, false, 'Invalid api key', 'error', true, 400)
      }
    }

    return generalResponse(res, false, 'Twilio / Sendgrid detail is required', 'error', true, 400)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateSendgridConfig = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { sendGrid } = req.body

    if (sendGrid && sendGrid?.apiKey) {
      try {
        sgClient.setApiKey(sendGrid?.apiKey)
        const request = {
          url: '/v3/scopes',
          method: 'GET'
        }
        const [, body] = await sgClient.request(request)
        if (body.scopes.includes('mail.send')) {
          const updateStatus = await updateIntegration(
            { _id: ObjectId(req.params.id), company: ObjectId(currentUser?.company) },
            req.body
          )
          if (updateStatus && updateStatus.matchedCount === 0) {
            return generalResponse(res, false, 'No record found.', 'error', true, 400)
          }
          const integration = await findIntegration({ _id: req.params.id })
          return generalResponse(res, integration, 'success')
        } else {
          return generalResponse(res, false, 'Invalid scope', 'error', true, 400)
        }
      } catch (err) {
        return generalResponse(res, false, 'Invalid api key', 'error', true, 400)
      }
    }
    return generalResponse(res, false, 'Sendgrid api key is required', 'error', true, 400)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addTwilioConfig = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { twilioKey } = req.body

    if (twilioKey) {
      try {
        const twilioClient = twilio(twilioKey.accountSid, twilioKey.authToken)
        await twilioClient.notify.services(twilioKey.notifyServiceSID).fetch()
        const integration = await createIntegration({ ...req.body, company: currentUser?.company })
        return generalResponse(res, integration, 'success')
      } catch (error) {
        return generalResponse(res, false, 'Invalid twilio config', 'error', true, 400)
      }
    }
    return generalResponse(res, false, 'Twilio config details are required', 'error', true, 400)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateTwilioConfig = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { twilioKey } = req.body

    if (twilioKey) {
      try {
        const twilioClient = twilio(twilioKey.accountSid, twilioKey.authToken)
        await twilioClient.notify.services(twilioKey.notifyServiceSID).fetch()
        const updateStatus = await updateIntegration(
          { _id: ObjectId(req.params.id), company: ObjectId(currentUser?.company) },
          req.body
        )
        if (updateStatus && updateStatus.matchedCount === 0) {
          return generalResponse(res, false, 'No record found.', 'error', true, 400)
        }
        const integration = await findIntegration({ _id: req.params.id })
        return generalResponse(res, integration, 'success')
      } catch (error) {
        return generalResponse(res, false, `Twilio error : ${error?.message} `, 'error', true, 400)
      }
    }
    return generalResponse(res, false, 'Twilio config details are required', 'error', true, 400)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
