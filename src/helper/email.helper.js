import { addDays } from 'date-fns'
import { ObjectId } from 'mongodb'
import _ from 'lodash'
import { getEmailThreadRepo, updateEmails } from '../repositories/email.repository'
import { getSyncLogs, updateSyncLog } from '../repositories/mail-sync-log.repository'
import { getProviderFolder } from '../repositories/mailProviderFolder.repository'
import { getSmtpImapCredential } from '../repositories/smtpImap.repository'
import { createTasks, findLastTask } from '../repositories/task.repository'
import { findAllTaskOption } from '../repositories/taskOption.repository'
import { watchImapMailJob } from '../schedular-jobs/smtp-imap/syncWatchQueue'
import { connectImap } from '../services/mail/imap-sync.service'
import { findAllContact } from '../repositories/contact.repository'

export const markReadUnreadHelper = async ({ company, user, email, threadIds, mailbox, read }) => {
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

  mailbox = folderData.providerSelection[mailbox]

  const mails = await getEmailThreadRepo({ params: { mail_provider_thread_id: { $in: threadIds } } }).select({
    message_id: 1
  })

  const response = await new Promise((resolve, reject) => {
    imap.openBox(mailbox, false, async (err) => {
      if (err) {
        reject(err)
      }
      await Promise.all(
        mails.map(({ message_id }) => {
          return new Promise((resolve, reject) => {
            imap.search([['HEADER', 'Message-ID', message_id]], async (error, uIds) => {
              if (error) {
                imap.end()
                return reject(err)
              }
              if (uIds?.length) {
                if (read === true) {
                  imap.setFlags(uIds, ['\\Seen'], (err) => {
                    if (err) reject(err)
                    resolve()
                    console.log('Marked message as read.', uIds)
                  })
                } else {
                  imap.delFlags(uIds, ['\\Seen'], (err) => {
                    if (err) reject(err)
                    resolve()
                    console.log('Marked message as unread.', uIds)
                  })
                }
              } else {
                resolve()
              }
            })
          })
        })
      )
      resolve()
      imap.end()
    })
  })

  // HELLO
  // if (read === true) {
  //   await updateEmails(
  //     {
  //       mail_provider_thread_id: { $in: threadIds }
  //     },
  //     { $push: { flags: '\\Seen' } }
  //   )
  // } else {
  //   await updateEmails(
  //     {
  //       mail_provider_thread_id: { $in: threadIds }
  //     },
  //     { $pull: { flags: '\\Seen' } }
  //   )
  // }

  return response
}

export const markAsStarredAndUnStarredHelper = async ({
  company,
  user,
  email,
  threadIds,
  mailbox,
  starred,
  messageId
}) => {
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

  let mails = []
  mailbox = folderData.providerSelection[mailbox]

  if (messageId) {
    mails = [{ message_id: messageId }]
  } else {
    mails = await getEmailThreadRepo({ params: { mail_provider_thread_id: { $in: threadIds } } }).select({
      message_id: 1
    })
  }

  const response = await new Promise((resolve, reject) => {
    imap.openBox(mailbox, false, async (err) => {
      if (err) {
        reject(err)
      }
      await Promise.all(
        mails.map(({ message_id }) => {
          return new Promise((resolve, reject) => {
            imap.search([['HEADER', 'Message-ID', message_id]], async (error, uIds) => {
              if (error) {
                imap.end()
                return reject(err)
              }

              if (uIds?.length) {
                if (starred === true) {
                  imap.setFlags(uIds, ['\\Flagged'], (err) => {
                    if (err) reject(err)
                    imap.delFlags(uIds, ['\\Seen'], (err) => {
                      if (err) reject(err)
                      resolve()
                      console.log('Marked message as unread.', uIds)
                    })
                    console.log('Marked message as starred.', uIds)
                  })
                } else {
                  imap.delFlags(uIds, ['\\Flagged'], (err) => {
                    if (err) reject(err)
                    resolve()
                    console.log('Marked message as un-starred.', uIds)
                  })
                }
              } else {
                resolve()
              }
            })
          })
        })
      )
      resolve()
      imap.end()
    })
  })

  if (messageId) {
    if (starred === true) {
      await updateEmails(
        {
          message_id: messageId
        },
        { $push: { flags: '\\Flagged' } }
      )
      await updateEmails(
        {
          message_id: messageId
        },
        { $pull: { flags: '\\Seen' } }
      )
    } else {
      await updateEmails(
        {
          message_id: messageId
        },
        { $pull: { flags: '\\Flagged' } }
      )
    }
  } else {
    if (starred === true) {
      await updateEmails(
        {
          mail_provider_thread_id: { $in: threadIds }
        },
        { $push: { flags: '\\Flagged' } }
      )
      await updateEmails(
        {
          mail_provider_thread_id: { $in: threadIds }
        },
        { $pull: { flags: '\\Seen' } }
      )
    } else {
      await updateEmails(
        {
          mail_provider_thread_id: { $in: threadIds }
        },
        { $pull: { flags: '\\Flagged' } }
      )
    }
  }

  return response
}

export const initialMailWatcherSet = async () => {
  try {
    console.log('---------------InitialMailWatcherSet--------------->>START')
    const syncLogs = await getSyncLogs().select({
      user: 1,
      company: 1,
      providerEmail: 1
    })

    for (const syncLog of syncLogs) {
      const { user, company, providerEmail } = syncLog
      const job = await watchImapMailJob({
        providerName: 'smtp',
        user,
        company,
        partial: true,
        email: providerEmail
      })
      if (job?.id) {
        await updateSyncLog({ user, providerName: 'smtp', providerEmail, company }, { mailWatcherJobId: job.id })
      } else {
        console.log(
          `Error:InitialMailWatcherSet-watchImapMailJob${syncLog.company}-${syncLog.user}-${syncLog.providerEmail}`
        )
      }
    }
    console.log('---------------InitialMailWatcherSet--------------->>END')
  } catch (error) {
    console.log('Error:initialMailWatcherSet', error)
  }
}

export const taskCreateFromEmail = async ({ body, currentUser, appendTitle }) => {
  try {
    const { subject, html, attachments = [], taskValue, to = [], cc = [], bcc = [] } = body

    const tempAttachment = _.cloneDeep(attachments)
    let contact = body.contact
    let assigned = []
    if (!contact) {
      contact = taskValue?.contact?.value
      assigned = taskValue?.assigned?.map((obj) => obj.value)
    }

    if (!contact && !taskValue) {
      const contacts = await findAllContact({
        email: { $in: [...to, ...cc, ...bcc] },
        company: ObjectId(currentUser.company)
      }).select({ _id: 1 })
      contact = contacts?.[0]?._id
    }

    const lastTask = await findLastTask({
      params: { company: ObjectId(currentUser.company) },
      projection: { taskNumber: 1 }
    })
    const lastTaskNumber = !lastTask?.taskNumber ? 1000 : +lastTask.taskNumber + 1
    const taskOptions = await findAllTaskOption({ company: ObjectId(currentUser.company) })
    const priority = taskOptions.filter((o) => o.type === 'priority')?.[0]
    const status = taskOptions.filter((o) => o.type === 'status')?.[0]
    const tasks = await createTasks([
      {
        name: taskValue?.name || `${appendTitle} ${subject}`,
        details: taskValue?.details || html,
        completedTaskInstruction: taskValue?.completedTaskInstruction,
        company: ObjectId(currentUser.company),
        assigned: assigned || [],
        category: taskValue?.category?._id,
        createdBy: currentUser._id,
        taskNumber: `${lastTaskNumber}`,
        attachments: tempAttachment.map((attachment) => ({
          ...attachment,
          fileUrl: attachment.fileUrl.replace(process.env.EMAIL_ATTACHMENT_REMOVE_PATH, '')
        })),
        startDate: taskValue?.startDate || new Date(),
        endDate: taskValue?.endDate || addDays(new Date(), 5),
        order: 0,
        kanbanCategotyorder: 0,
        kanbanStatusorder: 0,
        kanbanPriorityorder: 0,
        est_time_complete: taskValue?.est_time_complete,
        priority: taskValue?.priority?._id || priority?._id,
        status: taskValue?.status?._id || status?._id,
        ...(contact && { contact })
      }
    ])
    return tasks
  } catch (error) {
    console.log('Error:taskCreateFromEmail', error)
  }
}

export const getFilterQuery = (filters = [], emailParticipant) => {
  const $and = []
  if (emailParticipant) {
    $and.push({ $or: [{ 'to.address': emailParticipant }, { 'from.address': emailParticipant }] })
  }

  const $or = []
  if (filters.includes('UNSEEN')) {
    $or.push({
      flags: {
        $nin: ['\\Seen']
      }
    })
  } else if (filters.includes('SEEN')) {
    $or.push({
      flags: {
        $all: ['\\Seen']
      }
    })
  }

  if ($or.length) {
    $and.push({ $or })
  }

  return { ...($and.length && { $and }) }
}

export const isUnReadMail = (flags) => {
  return flags.reduce((prev, obj) => (!obj.includes('\\Seen') ? prev + 1 : prev), 0)
}
