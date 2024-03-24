import _ from 'lodash'
import { getSelectParams } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import {
  createEmail,
  getEmail,
  getEmailByThreadIdRepo,
  getEmailThreadRepo,
  getEmailsCountRepo,
  getEmailsRepo,
  getNextEmailsRepo,
  getPrevEmailsRepo,
  updateEmails
} from '../repositories/email.repository'
import { ObjectId } from 'mongodb'
import { getSmtpImapCredential } from '../repositories/smtpImap.repository'
import { forwardSmtpMail, replySmtpMail, sendSmtpMail, verifySmtpConnection } from '../services/nodemailer'
import {
  getFilterQuery,
  isUnReadMail,
  markAsStarredAndUnStarredHelper,
  taskCreateFromEmail
} from '../helper/email.helper'
import { parseData } from '../utils/utils'
import { getProviderFolder } from '../repositories/mailProviderFolder.repository'
import { connectImap } from '../services/mail/imap-sync.service'
import { singleMailBoxSync } from '../services/mail/single-mail-box-sync.service'
import { findContact } from '../repositories/contact.repository'
import { readMailJob } from '../schedular-jobs/smtp-imap/syncWatchQueue'
import { MAIL_LABELS } from '../constants/email.constant'

export const getEmails = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { email, folder, page = 1, limit = 50, search, contact, filters = [] } = req.query
    const reg = new RegExp(search, 'i')
    const searchObj = {
      subject: { $regex: reg }
    }
    let tempFilter = filters
    let tempFolder = folder
    // If select unread tab from sidebar ui then add extra filter for unread mail and mail fetch from inbox
    if (folder === 'Unread') {
      tempFilter = ['UNSEEN']
    }
    if (folder === 'Unread') {
      tempFolder = MAIL_LABELS.Inbox
    }

    const advanceFilters = getFilterQuery(tempFilter, contact)

    const data = await getEmailsRepo({
      params: {
        ...(search && searchObj),
        company: ObjectId(company),
        user: ObjectId(user),
        email,
        ...advanceFilters
      },
      project: { ...getSelectParams(req) },
      skip: limit * page - limit,
      limit,
      folders: tempFolder
    })

    const count = await getEmailsCountRepo({
      params: {
        company: ObjectId(company),
        user: ObjectId(user),
        email,
        folders: tempFolder,
        ...advanceFilters
      }
    })

    return generalResponse(
      res,
      {
        rows: data,
        count: count?.[0]?.threadCount || 0,
        folder
      },
      'success',
      'success',
      false,
      200
    )
  } catch (error) {
    console.log('Error:getEmails', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const getEmailsCount = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { folders, contact } = req.query

    let availableFolders = []

    if (folders) {
      const qFolders = JSON.parse(folders)
      if (typeof qFolders === 'string') {
        availableFolders = [qFolders]
      } else if (Array.isArray(qFolders)) {
        availableFolders = qFolders
      }
    } else {
      const folderData = await getProviderFolder({
        company,
        mailProvider: 'smtp',
        user
      }).select({ providerSelection: 1 })

      if (folderData) {
        const mailFolders = folderData.providerSelection
        availableFolders = Object.keys(mailFolders).filter((folder) => !!mailFolders[folder])
      }
    }

    const result = await Promise.all(
      availableFolders.map((folder) =>
        getEmailsCountRepo({
          params: {
            company: ObjectId(company),
            user: ObjectId(user),
            folders: folder,
            ...(contact ? { $or: [{ 'to.address': contact }, { 'from.address': contact }] } : {})
          }
        })
      )
    )

    const foldersCount = availableFolders.reduce((p, c, index) => {
      return { ...p, [c]: result[index]?.[0]?.threadCount || 0 }
    }, {})

    // Here add extra count for unread sidebar tab for extra filter
    if (availableFolders.includes('Inbox')) {
      const UnreadCount = await getEmailsCountRepo({
        params: {
          company: ObjectId(company),
          user: ObjectId(user),
          folders: 'Inbox',
          flags: {
            $nin: ['\\Seen']
          },
          ...(contact ? { $or: [{ 'to.address': contact }, { 'from.address': contact }] } : {})
        }
      })
      foldersCount.Unread = UnreadCount[0]?.threadCount ?? 0
    }

    return generalResponse(res, { foldersCount }, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const getEmailThread = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { mail_provider_thread_id, email, mailbox } = req.query

    const data = await getEmailThreadRepo({
      params: {
        mail_provider_thread_id,
        company: ObjectId(company),
        user: ObjectId(user)
      }
    })

    if (data?.length && isUnReadMail(data.map((obj) => obj.flags))) {
      await updateEmails(
        {
          mail_provider_thread_id: { $in: [mail_provider_thread_id] }
        },
        { $push: { flags: '\\Seen' } }
      )

      await readMailJob({
        company,
        email,
        mailbox: mailbox === 'Unread' ? MAIL_LABELS.Inbox : mailbox,
        threadIds: [mail_provider_thread_id],
        user,
        read: true
      })
    }

    return generalResponse(res, data, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const getEmailThreadById = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { id } = req.params
    const { folders } = req.query

    const data = await getEmailByThreadIdRepo({
      mail_provider_thread_id: id,
      company,
      user,
      folders
    })

    return generalResponse(res, data?.[0] || null, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error:getEmailThreadById', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const sendMail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { from, to = [], subject, html, cc = [], bcc = [], attachments = [], createTask } = req.body

    const tempAttachment = _.cloneDeep(attachments)

    const smtpImapCred = await getSmtpImapCredential({
      company,
      user,
      username: from,
      type: 'smtp'
    })

    if (smtpImapCred) {
      const { host, port, secure, username, password } = smtpImapCred
      const smtpConnOptions = {
        host,
        port,
        secure,
        auth: {
          user: username,
          pass: password
        },
        type: 'smtp'
      }

      const validSMTPTransport = await verifySmtpConnection(smtpConnOptions)
      if (!validSMTPTransport) {
        throw new Error('Your smtp credentials is not configured properly. please re-check the credentials.')
      }

      const sendMailData = await sendSmtpMail(smtpConnOptions, {
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        attachments: [...attachments]
      })

      let tasks = null
      if (createTask) {
        tasks = await taskCreateFromEmail({
          body: {
            ...req.body,
            attachments: [
              ...tempAttachment
                ?.filter((attachment) => !attachment.cid)
                .map((attachment) => ({
                  ...attachment,
                  fileName: attachment.filename,
                  fileUrl: attachment.path.replace(process.env.EMAIL_ATTACHMENT_REMOVE_PATH, '')
                }))
            ]
          },
          currentUser,
          appendTitle: 'Email:'
        })
      }
      if (sendMailData.messageId) {
        await createEmail({
          user,
          company,
          message_id: sendMailData.messageId,
          mail_provider_thread_id: sendMailData.messageId,
          send_date: new Date(),
          to: to.map((email) => ({ address: email, name: '' })),
          cc: cc.map((email) => ({ address: email, name: '' })),
          bcc: bcc.map((email) => ({ address: email, name: '' })),
          attachments: [...tempAttachment],
          from: {
            address: from,
            name: ''
          },
          email: from,
          folders: ['Sent'],
          html,
          subject,
          mail_provider: 'smtp',
          ...(tasks?.[0]?._id && { task: ObjectId(tasks[0]._id) })
        })
      }
      return generalResponse(res, null, 'Mail send successfully.', 'success', false, 200)
    } else {
      throw new Error('Something went wrong.')
    }
  } catch (error) {
    console.log('Error:sendMail', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const replyMail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const {
      from,
      to = [],
      subject,
      html,
      cc = [],
      bcc = [],
      attachments = [],
      message_id,
      mail_provider_thread_id,
      createTask,
      taskValue
    } = req.body

    const tempAttachment = _.cloneDeep(attachments)

    const smtpImapCred = await getSmtpImapCredential({
      company,
      user,
      username: from,
      type: 'smtp'
    })
    if (smtpImapCred) {
      const { host, port, secure, username, password } = smtpImapCred
      const smtpConnOptions = {
        host,
        port,
        secure,
        auth: {
          user: username,
          pass: password
        },
        type: 'smtp'
      }
      const validSMTPTransport = await verifySmtpConnection(smtpConnOptions)
      if (!validSMTPTransport) {
        throw new Error('Your smtp credentials is not configured properly. please re-check the credentials.')
      }

      const mailData = await getEmail({ message_id })

      if (!mailData) {
        throw new Error('Invalid mail provider thread id.')
      }

      const replyMailData = await replySmtpMail(smtpConnOptions, {
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        attachments: [...attachments],
        thread_id: mail_provider_thread_id
      })

      if (replyMailData.messageId) {
        let tasks = null
        if (createTask) {
          tasks = await taskCreateFromEmail({
            body: {
              ...req.body,
              attachments: [
                ...tempAttachment
                  ?.filter((attachment) => !attachment.cid)
                  .map((attachment) => ({
                    ...attachment,
                    fileName: attachment.filename,
                    fileUrl: attachment.path.replace(process.env.EMAIL_ATTACHMENT_REMOVE_PATH, '')
                  })),
                ...(taskValue?.attachments || [])
              ]
            },
            currentUser,
            appendTitle: 'Email Replied:'
          })
        }
        await createEmail({
          user,
          company,
          message_id: replyMailData.messageId,
          mail_provider_thread_id,
          send_date: new Date(),
          to: to.map((email) => ({ address: email, name: '' })),
          cc: cc.map((email) => ({ address: email, name: '' })),
          bcc: bcc.map((email) => ({ address: email, name: '' })),
          attachments: [...tempAttachment],
          from: {
            address: from,
            name: ''
          },
          email: from,
          folders: ['Sent'],
          html,
          subject,
          mail_provider: 'smtp',
          ...(tasks?.[0]?._id && { task: ObjectId(tasks[0]._id) })
        })
      }

      return generalResponse(res, null, 'Mail send successfully.', 'success', false, 200)
    } else {
      throw new Error('Something went wrong.')
    }
  } catch (error) {
    console.log('Error:replyMail', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const forwardMail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const {
      from,
      to = [],
      subject,
      html,
      cc = [],
      bcc = [],
      attachments = [],
      mail_provider_thread_id,
      createTask,
      taskValue
    } = req.body

    const tempAttachment = _.cloneDeep(attachments)

    const smtpImapCred = await getSmtpImapCredential({
      company,
      user,
      username: from,
      type: 'smtp'
    })
    if (smtpImapCred) {
      const { host, port, secure, username, password } = smtpImapCred
      const smtpConnOptions = {
        host,
        port,
        secure,
        auth: {
          user: username,
          pass: password
        },
        type: 'smtp'
      }
      const validSMTPTransport = await verifySmtpConnection(smtpConnOptions)
      if (!validSMTPTransport) {
        throw new Error('Your smtp credentials is not configured properly. please re-check the credentials.')
      }

      const replyMailData = await forwardSmtpMail(smtpConnOptions, {
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        attachments: [...attachments],
        thread_id: mail_provider_thread_id
      })

      if (replyMailData.messageId) {
        let tasks = null
        if (createTask) {
          tasks = await taskCreateFromEmail({
            body: {
              ...req.body,
              attachments: [
                ...tempAttachment
                  ?.filter((attachment) => !attachment.cid)
                  .map((attachment) => ({
                    ...attachment,
                    fileName: attachment.filename,
                    fileUrl: attachment.path.replace(process.env.EMAIL_ATTACHMENT_REMOVE_PATH, '')
                  })),
                ...(taskValue?.attachments || [])
              ]
            },
            currentUser,
            appendTitle: 'Email Forwarded:'
          })
        }
        await createEmail({
          user,
          company,
          message_id: replyMailData.messageId,
          mail_provider_thread_id,
          send_date: new Date(),
          to: to.map((email) => ({ address: email, name: '' })),
          cc: cc.map((email) => ({ address: email, name: '' })),
          bcc: bcc.map((email) => ({ address: email, name: '' })),
          attachments: [...tempAttachment],
          from: {
            address: from,
            name: ''
          },
          email: from,
          folders: ['Sent'],
          html,
          subject,
          mail_provider: 'smtp',
          ...(tasks?.[0]?._id && { task: ObjectId(tasks[0]._id) })
        })
      }

      return generalResponse(res, null, 'Mail send successfully.', 'success', false, 200)
    } else {
      throw new Error('Something went wrong.')
    }
  } catch (error) {
    console.log('Error:forwardMail', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const updateMail = async (req, res) => {
  try {
    const mails = await updateEmails()
    return generalResponse(res, mails, 'Mails updated successfully.', 'success', false, 200)
  } catch (error) {
    console.log('Error:updateMail', error)
  }
}

export const getNextPrevMail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { send_date, threadId, email, folder } = req.query // contact

    // const contactQuery = contact ? { $or: [{ 'to.address': contact }, { 'from.address': contact }] } : {}
    const previousMail = await getPrevEmailsRepo({
      params: {
        company: ObjectId(company),
        user: ObjectId(user),
        email,
        folders: folder
      },
      extraParams: {
        threadId,
        send_date
      }
    })

    const nextMail = await getNextEmailsRepo({
      params: {
        company: ObjectId(company),
        user: ObjectId(user),
        email,
        folders: folder
      },
      extraParams: {
        threadId,
        send_date
      }
    })

    return generalResponse(res, { previousMail: previousMail?.[0], nextMail: nextMail?.[0] }, '', 'success', false, 200)
  } catch (error) {
    console.log('Error:getNextPrevMail', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const attachmentUpload = (req, res) => {
  try {
    if (req?.files?.length) {
      return generalResponse(
        res,
        req?.files?.map((file) => {
          return file
        }),
        'success'
      )
    } else {
      throw new Error('')
    }
  } catch (error) {
    console.log('Error:attachmentUpload', error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const markAsReadAndUnRead = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { email, mailbox, read } = req.body

    const threadIds = parseData(req.body.threadIds)
    // HELLO
    if (read === true) {
      await updateEmails(
        {
          mail_provider_thread_id: { $in: threadIds }
        },
        { $push: { flags: '\\Seen' } }
      )
    } else {
      await updateEmails(
        {
          mail_provider_thread_id: { $in: threadIds }
        },
        { $pull: { flags: '\\Seen' } }
      )
    }

    // HELLO
    // const response = await markReadUnreadHelper({ company, email, mailbox, read, threadIds, user })
    const response = await readMailJob({ company, email, mailbox, read, threadIds, user })

    return generalResponse(
      res,
      response,
      `Mail mark as ${read ? 'read' : 'unread'} successfully.`,
      'success',
      false,
      200
    )
  } catch (error) {
    console.log('Error:markAsReadAndUnRead', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const markAsStarredAndUnStarred = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { email, mailbox, starred, threadIds, messageId } = req.body

    const response = await markAsStarredAndUnStarredHelper({
      company,
      email,
      mailbox,
      starred,
      threadIds,
      user,
      messageId
    })
    return generalResponse(
      res,
      response,
      `Mail mark as ${starred ? 'starred' : 'un-starred'} successfully.`,
      'success',
      false,
      200
    )
  } catch (error) {
    console.log('Error:markAsReadAndUnRead', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const mailMoveIntoSpecificFolder = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company, _id: user } = currentUser
    const { email, threadIds } = req.body

    const smtpImapCred = await getSmtpImapCredential({
      company,
      user,
      username: email,
      type: 'imap'
    })

    const imap = await connectImap({
      user: smtpImapCred.username,
      password: smtpImapCred.password,
      host: smtpImapCred.host,
      port: smtpImapCred.port
    })

    const folderData = await getProviderFolder({
      email,
      company,
      mailProvider: 'smtp',
      user
    }).select({ providerSelection: 1 })

    const mailbox = folderData.providerSelection[req.body.mailbox]
    const targetFolder = folderData.providerSelection[req.body.targetFolder]

    const mails = await getEmailThreadRepo({ params: { mail_provider_thread_id: { $in: threadIds } } }).select({
      message_id: 1
    })

    const response = await new Promise((resolve, reject) => {
      if (mailbox && targetFolder) {
        imap.openBox(mailbox, false, async (err) => {
          if (err) {
            reject(err)
          }
          const mailIds = mails.map(({ message_id }) => message_id)

          for (const messageId of mailIds) {
            await new Promise((resolve, reject) => {
              imap.search([['HEADER', 'Message-ID', messageId]], async (error, uIds) => {
                if (error) {
                  imap.end()
                  return reject(err)
                }
                if (uIds?.length) {
                  await new Promise((resolve, reject) => {
                    imap.addFlags(uIds, '\\Seen', function (err) {
                      err ? reject(err) : resolve()
                    })
                  })

                  // Move messages to trash folder
                  await new Promise((resolve, reject) => {
                    imap.move(uIds, targetFolder, function (err) {
                      err ? reject(err) : resolve()
                    })
                  })
                }
                resolve()
              })
            })
          }
          resolve()
          imap.end()
        })
      } else {
        reject(new Error('Something went wrong'))
      }
    })

    await singleMailBoxSync({ user, company, email, mailBox: targetFolder })

    return generalResponse(res, response, `Mail move into ${targetFolder} successfully.`, 'success', false, 200)
  } catch (error) {
    console.log('Error:mailMoveIntoSpecificFolder', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const getContactFromMail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { emails } = req.body
    const contact = await findContact({
      email: { $in: emails },
      company: ObjectId(currentUser.company)
    }).select({ _id: 1, firstName: 1, lastName: 1, email: 1, userProfile: 1 })

    return generalResponse(res, contact, 'Get contact from email successfully.', 'success', false, 200)
  } catch (error) {
    console.log('Error:getContactFromMail', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}
