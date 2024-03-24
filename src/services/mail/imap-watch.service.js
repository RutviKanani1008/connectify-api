import { MailParser } from 'mailparser'
import Imap from 'node-imap'
import { getSmtpImapCredential } from '../../repositories/smtpImap.repository'
import { setImapAttachments } from './imap-sync.service'
import ImapMessage from '../../builder/emailData.builder'
import { getProviderFolder } from '../../repositories/mailProviderFolder.repository'
import { findAndUpdateEmail, getEmail } from '../../repositories/email.repository'
import { MAIL_LABELS } from '../../constants/email.constant'
import { emitRequest } from '../../helper/socket-request.helper'

const userImapConnections = new Map()

export const watch = async (data) => {
  try {
    const { company, user } = data

    console.log('MAIL MAIL_WATCH STARTED IMAP 🚀')
    const smtpImapCred = await getSmtpImapCredential({
      company,
      user,
      type: 'imap'
    })
    console.log(`HELLO DATA DETAILS ${JSON.stringify(smtpImapCred)}`)
    if (smtpImapCred) {
      await imapWatch({
        smtpImapCred,
        syncData: data
      })
    }

    console.log('****UserImapConnections:Size****', userImapConnections.size)
    console.log('****UserImapConnections:Keys****', userImapConnections.keys())

    console.log('MAIL MAIL_WATCH END IMAP 🚀')
    return data
  } catch (err) {
    console.log(`ERROR INSIDE ${typeof err === 'string' ? err : JSON.stringify(err)}`)
    throw err
  }
}

export const imapWatch = async (data) => {
  try {
    const { smtpImapCred, syncData } = data

    const imap = await connectImap({
      user: smtpImapCred.username,
      password: smtpImapCred.password,
      host: smtpImapCred.host,
      port: smtpImapCred.port
    })

    const folderData = await getProviderFolder({
      company: syncData.company,
      mailProvider: 'smtp',
      user: syncData.user
    }).select({ providerSelection: 1 })

    const boxes = await getBoxes(imap)
    imap.end()

    const filteredBoxes = Object.values(folderData.providerSelection).filter((box) => boxes.includes(box))

    for (const box of filteredBoxes) {
      watchMailFolderWise({
        box,
        smtpImapCred,
        syncData,
        userSelectedFolder: folderData.providerSelection
      })
    }
  } catch (error) {
    console.log('Error:imapWatch', error)
  }
}

const watchMailFolderWise = ({ smtpImapCred, box: mailBox, syncData, userSelectedFolder }) => {
  const imap = new Imap({
    user: smtpImapCred.username,
    password: smtpImapCred.password,
    tls: true,
    authTimeout: 10000,
    host: smtpImapCred.host,
    port: smtpImapCred.port,
    tlsOptions: { rejectUnauthorized: false },
    keepalive: {
      interval: 10000, // Set the interval (in milliseconds) to keep the connection alive
      idleInterval: 300000, // Set the interval (in milliseconds) to keep the connection idle
      forceNoop: true // Send a NOOP command if the connection is idle
    }
  })

  imap.connect()

  const existingConnections = userImapConnections.get(`${syncData.company}-${syncData.user}-${syncData.email}`) || []
  userImapConnections.set(`${syncData.company}-${syncData.user}-${syncData.email}`, [...existingConnections, imap])

  imap.once('ready', async () => {
    console.log('Connected to IMAP server', mailBox)
    imap.openBox(mailBox, false, function (err, box) {
      if (err) throw err

      // Listen for new mail events
      imap.on('mail', () => {
        console.log('-----------NewMail:Watch--------------------', box.messages.total)
        const messageFetchQuery = imap.seq.fetch(box.messages.total + ':*', { bodies: '' })
        messageFetchQuery.on('message', (message) => {
          const parser = new MailParser()
          const parseResult = {
            attachments: [],
            body: {},
            headers: new Map(),
            attributes: undefined,
            mailBox: ''
          }
          message.on('body', (body, info) => {
            body.pipe(parser)
          })
          message.on('attributes', (attr) => {
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
                attachmentId: data.contentId
              }
              const attachment = []
              data.content.on('data', (_data) => {
                attachment.push(_data)
              })
              data.content.on('end', () => {
                const attachBuffer = Buffer.concat(attachment)
                parseResult.attachments.push({
                  ...attachmentInfo,
                  content: attachBuffer
                })
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
              message: { ...parseResult, mailBox },
              data: syncData,
              userSelectedFolder
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
            return saveMessage(mail, userSelectedFolder)
          })
          parser.on('error', (error) => {
            console.log('messageFetchQuery:error', error)
          })
        })
        messageFetchQuery.once('end', function () {
          console.log('Done fetching message!')
          // imap.end()
        })
        messageFetchQuery.on('error', (error) => {
          console.log('Error:messageFetchQuery', error?.message || error)
        })
      })
      imap.on('update', (seqNo, info) => {
        console.log('-----------UpdateMail:watch------------', { seqNo })
        const messageFetchQuery = imap.seq.fetch(seqNo, { bodies: '', struct: true })
        messageFetchQuery.on('message', (message) => {
          const parser = new MailParser()
          const parseResult = {
            attachments: [],
            body: {},
            headers: new Map(),
            attributes: undefined,
            mailBox: ''
          }
          message.on('body', (body, info) => {
            body.pipe(parser)
          })
          message.on('attributes', (attr) => {
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
                attachmentId: data.contentId
              }
              const attachment = []
              data.content.on('data', (_data) => {
                attachment.push(_data)
              })
              data.content.on('end', () => {
                const attachBuffer = Buffer.concat(attachment)
                parseResult.attachments.push({
                  ...attachmentInfo,
                  content: attachBuffer
                })
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
              message: { ...parseResult, mailBox },
              data: syncData,
              userSelectedFolder
            })
              .setInstance()
              .getResult()
            return updateMessage(mail)
          })
          parser.on('error', (error) => {
            console.log('messageFetchQuery:error', error)
          })
        })
        messageFetchQuery.once('end', function () {
          console.log('Done fetching message!')
        })
        messageFetchQuery.on('error', (error) => {
          console.log('Error:messageFetchQuery', error?.message || error)
        })
      })
    })
  })
}

const saveMessage = async (message, userSelectedFolder) => {
  try {
    const { folders, emailUid, ...restMessageObj } = message
    const tempFolders = [...folders]
    console.log('-----------------New Mail---------------')

    if (folders?.length) {
      if (message.flags.includes('\\Flagged') && !folders.includes(MAIL_LABELS.Starred)) {
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

      // Send socket to client for live update
      await emitRequest({
        eventName: `mail-watcher-${message.company}-${message.user}`,
        eventData: { type: 'NEW', folder: folders?.[0] }
      })
    }
  } catch (error) {
    console.log('Error:saveMessage', error)
  }
}

const updateMessage = async (message) => {
  try {
    const { folders = [], flags = [] } = message
    console.log('-----------------Update Mail---------------')
    if (folders?.length) {
      await findAndUpdateEmail(
        { message_id: message.message_id, company: message.company, user: message.user },
        {
          $set: {
            flags
          }
        }
      )

      if (!message.flags.includes('\\Flagged')) {
        await findAndUpdateEmail(
          { message_id: message.message_id, company: message.company, user: message.user },
          {
            $pull: { folders: MAIL_LABELS.Starred }
          }
        )
      }
    }

    // Send socket to client for live update
    await emitRequest({
      eventName: `mail-watcher-${message.company}-${message.user}`,
      eventData: { type: 'UPDATE', mail_provider_thread_id: message.mail_provider_thread_id }
    })
  } catch (error) {
    console.log('Error:saveMessage', error)
  }
}

export const getBoxes = async (imap) => {
  try {
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
  } catch (error) {
    console.log('getBoxes Error')
  }
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

export const removeWatcher = (data) => {
  try {
    const { company, user, email } = data
    const connections = userImapConnections.get(`${company}-${user}-${email}`)
    if (connections && connections.length > 0) {
      connections.forEach((imap) => imap.end())
      userImapConnections.delete(`${company}-${user}-${email}`)
      console.log(`All IMAP connections closed for ${`${company}-${user}-${email}`}`)
      console.log('---------------UserImapConnections--------------:Size', userImapConnections.size)
      console.log('---------------UserImapConnections--------------:Keys', userImapConnections.keys())
    }
  } catch (error) {
    console.log('Error:removeWatcher', error)
  }
}
