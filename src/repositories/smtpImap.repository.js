import { defaultConfig, defaultSmtp } from '../constants/email.constant'
import { verifyImapConnection } from '../services/imap'
import { SmtpImapCredential } from '../models/smtp-imap-credential'
import { ObjectId } from 'mongodb'
import { verifySmtpConnection } from '../services/nodemailer'

const createSmtpImapCredential = (data) => {
  return SmtpImapCredential.create(data)
}

export const getSmtpImapCredential = (params) => {
  return SmtpImapCredential.findOne(params)
}

export const getSmtpImapCredentials = (params) => {
  return SmtpImapCredential.find(params)
}

export const deleteSmtpImapCredentialRepo = (params) => {
  return SmtpImapCredential.delete(params)
}

export const updateSmtpImapCredential = (search, updateValue) => {
  return SmtpImapCredential.updateOne(search, updateValue)
}

export const addSmtpImapData = async (data) => {
  // SMTP
  const upsertData = formUpsertObj(data.config.smtp, data.company, data.userId)
  await upsertSmtpImapCredentials(upsertData)

  // IMAP
  const upsertImapData = formUpsertObj(data.config.imap, data.company, data.userId)
  await upsertSmtpImapCredentials(upsertImapData)
}

export const updateSmtpImapData = async (data) => {
  // SMTP
  await updateSmtpImapCredential(
    {
      type: 'smtp',
      company: ObjectId(data.company),
      user: ObjectId(data.userId),
      username: data.config.smtp.auth.user
    },
    {
      password: data.config.smtp.auth.password,
      updatedBy: data.userId
    }
  )

  // IMAP
  await updateSmtpImapCredential(
    {
      type: 'imap',
      company: ObjectId(data.company),
      user: ObjectId(data.userId),
      username: data.config.imap.auth.user
    },
    {
      password: data.config.imap.auth.password,
      updatedBy: data.userId
    }
  )
}

const formUpsertObj = (formObj, company, userId) => {
  const data = {
    type: formObj.type,
    host: formObj.host,
    port: formObj.port,
    secure: formObj.secure,
    username: formObj.auth.user,
    password: formObj.auth.pass,
    company: ObjectId(company),
    user: ObjectId(userId),
    createdBy: userId,
    updatedBy: userId,
    isMapped: false
  }
  const upsertData = {
    createArgs: data,
    findArgs: {
      type: formObj.type,
      company: ObjectId(company),
      user: ObjectId(userId),
      username: formObj.auth.user
    },
    updateArgs: null
  }
  return upsertData
}

const upsertSmtpImapCredentials = async (data) => {
  try {
    const existingData = await getSmtpImapCredential(data.findArgs)

    if (!existingData) {
      await createSmtpImapCredential(data.createArgs)
    } else {
      data.updateArgs = {
        data: data.createArgs,
        where: { id: existingData._id }
      }

      await updateSmtpImapCredential(data.updateArgs.where, data.updateArgs.data)
    }
  } catch (error) {
    console.log('Error:upsertSmtpImapCredentials', error)
    throw new Error(error)
  }
}

export const findSmtpConfigs = async ({ email, password, smtpHost, imapHost }) => {
  const domain = findHost(email)
  const configs = findConfigsFromHost(domain)

  if (configs) {
    configs.smtp.auth.user = email
    configs.smtp.auth.pass = password
    configs.imap.auth.user = email
    configs.imap.auth.pass = password
  }
  if (smtpHost) {
    configs.smtp.host = smtpHost
  }
  if (imapHost) {
    configs.imap.host = imapHost
  }
  return configs
}

const findHost = (email) => {
  const domain = email.substring(email.lastIndexOf('@') + 1)
  return domain
}

const findConfigsFromHost = (domain) => {
  const resultData = defaultConfig
  const details = defaultSmtp.find((el) => el.serverDomain.includes(domain))
  if (details) {
    resultData.smtp.host = details.config.smtp.host
    resultData.smtp.port = details.config.smtp.port
    resultData.smtp.secure = details.config.smtp.secure
    resultData.imap.host = details.config.imap.host
    resultData.imap.port = details.config.imap.port
    resultData.imap.secure = details.config.smtp.secure
  }
  return resultData
}

export const connectionVerifiers = async (data) => {
  try {
    const smtp = await verifySmtpConnection(data.config.smtp)
    const imap = await imapVerifiers(data)
    return { smtp, imap }
  } catch (error) {
    console.log('connectionVerifiers', error)
    throw new Error('Connection verification failed:Please check credentials')
  }
}

export const imapVerifiers = async (data) => {
  try {
    let mailBoxes = false
    const response = await verifyImapConnection(data.config.imap, {
      mailbox: 'INBOX',
      action: 'VERIFY',
      markSeen: false
    })
    if (response) {
      mailBoxes = response
    }
    return mailBoxes
  } catch (error) {
    console.log('imapVerifiers', error)
    throw new Error('Imap connection verification failed:Please check credentials')
  }
}
