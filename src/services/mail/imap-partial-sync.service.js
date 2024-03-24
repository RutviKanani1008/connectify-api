import Imap from 'node-imap'
import _ from 'lodash'
import { getSmtpImapCredential } from '../../repositories/smtpImap.repository'
import { MailParser } from 'mailparser'
import ImapMessage from '../../builder/emailData.builder'
import { findAndUpdateEmail, getEmail, updateEmails } from '../../repositories/email.repository'
import { fileUploadBase64Data } from '../../helpers/file-upload.helper'
import { getProviderFolder } from '../../repositories/mailProviderFolder.repository'
import { updateSyncLog } from '../../repositories/mail-sync-log.repository'
import { MAIL_LABELS } from '../../constants/email.constant'
import { format, subDays } from 'date-fns'

export const partialSync = async (data) => {
  try {
    const { company, user, email } = data
    console.log('MAIL PARTIAL_SYNC STARTED IMAP 🚀')
    const smtpImapCred = await getSmtpImapCredential({
      company,
      user,
      username: email,
      type: 'imap'
    })

    console.log(`HELLO DATA DETAILS ${JSON.stringify(smtpImapCred)}`)

    if (smtpImapCred) {
      await fullSyncImap({
        smtpImapCred,
        syncData: data
      })
    }
    console.log('MAIL PARTIAL_SYNC END IMAP 🚀')
    return data
  } catch (err) {
    console.log('Error:partialSync', err?.message ? err?.message : err)
    throw err
  }
}

export const fullSyncImap = async (data) => {
  try {
    const { smtpImapCred, syncData } = data

    const imap = await connectImap({
      user: smtpImapCred.username,
      password: smtpImapCred.password,
      host: smtpImapCred.host,
      port: smtpImapCred.port
    })

    const folderData = await getProviderFolder({
      email: syncData.email,
      company: syncData.company,
      mailProvider: 'smtp',
      user: syncData.user
    }).select({ providerSelection: 1 })

    const boxes = await getBoxes(imap)
    imap.end()

    const filteredBoxes = Object.values(folderData.providerSelection).filter((box) => boxes.includes(box))

    let lastMailIdObj = { ...(syncData?.lastMailIdObj || {}) }
    let syncedMailMessageId = {}

    console.log('***********', { lastMailIdObj }, '*************')

    for (const box of filteredBoxes) {
      const response = await imapFolderSync({
        ...data,
        mailBox: box,
        userSelectedFolder: folderData.providerSelection,
        syncedMailMessageId
      })

      if (response) {
        lastMailIdObj = { ...lastMailIdObj, ...response.uid }
        syncedMailMessageId = { ...syncedMailMessageId, ...response.syncedMailMessageId }
        await updateSyncLog({ user: syncData.user, providerName: 'smtp', company: syncData.company }, { lastMailIdObj })
      }
    }
  } catch (error) {
    console.log('Error:fullSyncImap', error)
  }
}

export const getBoxes = (imap) => {
  const getRecursiveBoxNames = (boxes) => {
    return Object.keys(boxes).reduce((list, box) => {
      if (boxes[box].children) {
        const childBoxes = getRecursiveBoxNames(boxes[box].children).map(
          (name) => `${box}${boxes[box].delimiter}${name}`
        )
        list.push(...childBoxes)
      } else {
        list.push(box)
      }
      return list
    }, [])
  }

  return new Promise((resolve, reject) => {
    imap.getBoxes((error, boxes) => {
      if (error) {
        reject(error)
      } else {
        resolve(getRecursiveBoxNames(boxes))
      }
    })
  })
}

const imapFolderSync = async (data) => {
  try {
    console.log(`${data.mailBox} 📂 FOLDER SYNC STARTED IMAP  -->START`)
    const lastMailId = await startImapProcess(data)
    await startImapProcess(data, 'SEEN')
    await startImapProcess(data, 'UNSEEN')
    await startImapProcess(data, 'FLAGGED')
    await startImapProcess(data, 'UNFLAGGED')
    console.log(`${data.mailBox} 📂 FOLDER SYNC STARTED IMAP  -->END`)
    return lastMailId
  } catch (err) {
    console.log(`ERROR:imapFolderSync ${typeof err === 'string' ? err : JSON.stringify(err)}`)
    throw err
  }
}

const startImapProcess = async (data, type) => {
  return new Promise((resolve, reject) => {
    const { smtpImapCred, syncData, mailBox, syncedMailMessageId } = data
    const fetchedMessageUIDs = []
    const imap = new Imap({
      user: smtpImapCred.username,
      password: smtpImapCred.password,
      tls: true,
      authTimeout: 50000,
      connTimeout: 50000,
      host: smtpImapCred.host,
      port: smtpImapCred.port,
      tlsOptions: { rejectUnauthorized: false }
    })

    imap.connect()
    imap.once('ready', async () => {
      try {
        console.log('-----------------------------------------------------------READY-->START')
        const response = await readORWatchInbox()
        imap.end()
        resolve({
          uid: {
            [mailBox]: response?.uidnext
          },
          syncedMailMessageId
        })
        console.log('-----------------------------------------------------------READY-->END')
      } catch (error) {
        imap.end()
        console.log('Error:ready', error)
        reject(error)
      }
    })

    const readORWatchInbox = async () => {
      return new Promise((resolve, reject) => {
        imap.openBox(data.mailBox, false, async (err, box) => {
          if (err) {
            console.log('Error:openBox', err.message || err)
            return reject(err)
          } else {
            console.log(`Imap --${data.mailBox}-- Connected.`)
            await parseUnreadMessages({ boxDetail: box, type })
            return resolve(box)
          }
        })
      })
    }

    const parseUnreadMessages = ({ type }) => {
      return new Promise((resolve, reject) => {
        try {
          imap.search(getSearchQuery({ type, mailBox, syncData }), async (err, results) => {
            console.log('--------------results-------------', results?.length)
            if (err) {
              console.log('Error:parseUnreadMessages:search', err)
              return reject(err)
            } else {
              if (type) {
                console.log(`HELLO DATA RESULTS ${mailBox}`, results)
                if (results?.length) {
                  await updateFlags({ syncData, type, results, mailBox })
                }
              } else {
                console.log(`HELLO DATA RESULTS ${mailBox}`, results)
                const chunkArray = _.chunk(results || [], 50)
                for (const chunk of chunkArray) {
                  await Promise.all(chunk.map((result) => getMessage({ uid: result })))
                }
              }
              console.info(`Done Mail Processing Using IMAP ${mailBox} 😄`)
              return resolve()
            }
          })
        } catch (error) {
          console.log('Error:parseUnreadMessages-Promise', error)
          return reject(error)
        }
      })
    }

    const getMessage = async ({ uid }) => {
      return new Promise((resolve, reject) => {
        try {
          imap.search([['UID', uid]], async (err, results) => {
            if (err) {
              console.log('Error:getMessage- imap.search', err)
              reject(err)
            } else {
              if (results.length > 0) {
                const messageFetchQuery = imap.fetch(results[0], {
                  bodies: '',
                  struct: true
                })
                messageFetchQuery.on('message', (message) => {
                  const parser = new MailParser()
                  const parseResult = {
                    attachments: [],
                    body: {},
                    headers: new Map(),
                    attributes: undefined,
                    mailBox: ''
                  }
                  message.on('body', (body) => {
                    body.pipe(parser)
                  })
                  message.on('attributes', (attr) => {
                    fetchedMessageUIDs.push(attr.uid)
                    parseResult.attributes = attr
                  })

                  parser.on('headers', (headers) => {
                    parseResult.headers = headers
                  })

                  parser.on('data', (data) => {
                    if (data.type === 'attachment') {
                      const attachmentInfo = {
                        filename: data.filename,
                        contentType: data.contentType,
                        partId: data.partId,
                        attachmentId: data.contentId,
                        cid: data.cid
                      }
                      const attachment = []
                      data.content.on('data', (_data) => {
                        attachment.push(_data)
                      })
                      data.content.on('end', () => {
                        if (data.filename) {
                          const attachBuffer = Buffer.concat(attachment)
                          parseResult.attachments.push({
                            ...attachmentInfo,
                            content: attachBuffer
                          })
                        }
                        data.release()
                      })
                    }
                    if (data.type === 'text') {
                      parseResult.body = {
                        type: data.type,
                        text: data.text,
                        html: data.html,
                        textAsHtml: data.textAsHtml
                      }
                    }
                  })
                  parser.on('end', async () => {
                    const mail = new ImapMessage({
                      message: { ...parseResult, mailBox, emailUid: uid },
                      data: syncData,
                      userSelectedFolder: data.userSelectedFolder
                    })
                      .setInstance()
                      .getResult()
                    if (message.attachments?.length) {
                      mail.attachments = await setImapAttachments({
                        attachments: message.attachments,
                        company: mail.company,
                        user: mail.user
                      })
                    }
                    await saveMessage(mail, data.userSelectedFolder, syncedMailMessageId)
                    syncedMailMessageId[mail.message_id] = true
                    return resolve('Done fetching message!')
                  })
                  parser.on('error', (error) => {
                    console.log('messageFetchQuery:error', error)
                    return reject(error)
                  })
                })
                messageFetchQuery.on('error', (error) => {
                  console.log('Error:messageFetchQuery', error?.message || error)
                  return reject(error)
                })
              } else {
                return resolve('No Result')
              }
            }
          })
        } catch (error) {
          console.log('Error:getMessage---', error)
          return reject(error)
        }
      })
    }

    // return new Promise((resolve, reject) => {
    //   myEmitter.on('error', (err) => {
    //     console.log('Error:startImapProcess', err.message || err)
    //     imap.end()
    //     reject(err)
    //   })
    //   myEmitter.on('process:end', async ({ boxDetail }) => {
    //     try {
    //       console.log(`🔥 HELLO END SYNC ${mailBox}`)
    //       imap.end()
    //       myEmitter.removeAllListeners()
    //       return resolve({
    //         uid: {
    //           [mailBox]: boxDetail?.uidnext
    //         },
    //         syncedMailMessageId
    //       })
    //     } catch (error) {
    //       console.log('Error:process:end', error)
    //       imap.end()
    //       reject(error)
    //     }
    //   })
    // })
  })
}

export const connectImap = (config) => {
  return new Promise((resolve, reject) => {
    const imap = new Imap({ ...config, tls: true, tlsOptions: { rejectUnauthorized: false } })
    imap.connect()
    imap.on('ready', () => {
      console.log('imap Connected 🚀')
      resolve(imap)
    })

    imap.on('error', (err) => {
      reject(err)
    })

    imap.on('close', () => {
      console.log('Imap Disconnected .')
    })
  })
}

export const saveMessage = async (message, userSelectedFolder) => {
  try {
    const { folders = [], emailUid = [], ...restMessageObj } = message
    const tempFolders = [...folders]
    if (folders?.length) {
      if (message.flags?.includes('\\Flagged') && !folders.includes(MAIL_LABELS.Starred)) {
        const flaggedMail = await getEmail({
          message_id: message.message_id,
          company: message.company,
          user: message.user
        }).select({ emailUid: 1 })

        const flaggedMailUid = flaggedMail?.emailUid?.find(
          (obj) => obj.mailBox === userSelectedFolder[MAIL_LABELS.Starred]
        )
        if (flaggedMailUid) {
          folders.push(MAIL_LABELS.Starred)
          emailUid.push(flaggedMailUid)
        }
      }

      await findAndUpdateEmail(
        { message_id: message.message_id, company: message.company, user: message.user },
        {
          $set: {
            ...restMessageObj,
            ...(!tempFolders.includes(MAIL_LABELS.Starred) && { emailUid, folders })
          },
          ...(tempFolders.includes(MAIL_LABELS.Starred) && {
            $push: { emailUid: { $each: emailUid }, folders: { $each: folders } }
          })
        }
      )
    }
  } catch (error) {
    console.log('Error:saveMessage', error)
  }
}

export const setImapAttachments = async (data) => {
  try {
    const { attachments, company, user } = data
    const uploadSingleFile = async (attachment) => {
      const uploadedFile = await fileUploadBase64Data({
        base64Data: attachment.content,
        contentType: attachment.contentType,
        fileName: attachment.filename,
        folderName: 'imap',
        company,
        user
      })
      return {
        contentType: attachment.contentType,
        filename: attachment.filename,
        path: uploadedFile.Location,
        cid: attachment?.cid
      }
    }
    return Promise.all((attachments || [])?.map?.((attachment) => uploadSingleFile(attachment)))
  } catch (error) {
    console.log('Error:setImapAttachments', error)
  }
}

export const getSearchQuery = ({ type, syncData, mailBox }) => {
  const dateFormat = 'PP'
  const now = new Date()
  const days = 30

  switch (type) {
    case 'SEEN':
      return ['SEEN', ['SINCE', `${format(subDays(now.getTime(), days), dateFormat)}`]]
    case 'UNSEEN':
      return ['UNSEEN', ['SINCE', `${format(subDays(now.getTime(), days), dateFormat)}`]]
    case 'FLAGGED':
      return ['FLAGGED', ['SINCE', `${format(subDays(now.getTime(), days), dateFormat)}`]]
    case 'UNFLAGGED':
      return ['UNFLAGGED', ['SINCE', `${format(subDays(now.getTime(), days), dateFormat)}`]]
    default:
      return [['UID', `${syncData.lastMailIdObj[mailBox]}:*`]]
  }
}

const updateFlags = async ({ syncData, type, results = [], mailBox }) => {
  const mapper = {
    SEEN: '\\Seen',
    UNSEEN: '\\Seen',
    FLAGGED: '\\Flagged',
    UNFLAGGED: '\\Flagged'
  }

  if (type === 'SEEN' || type === 'FLAGGED') {
    await updateEmails(
      {
        email: syncData.email,
        company: syncData.company,
        user: syncData.user,
        $or: results.map((uuId) => ({
          emailUid: {
            $elemMatch: {
              mailBox,
              uuId
            }
          }
        }))
      },
      { $push: { flags: mapper[type] } }
    )
  } else if (type === 'UNSEEN' || type === 'UNFLAGGED') {
    await updateEmails(
      {
        email: syncData.email,
        company: syncData.company,
        user: syncData.user,
        $or: results.map((uuId) => ({
          emailUid: {
            $elemMatch: {
              mailBox,
              uuId
            }
          }
        }))
      },
      { $pull: { flags: mapper[type] } }
    )
  }
}
