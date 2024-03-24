import Imap from 'node-imap'
import _ from 'lodash'
import EventEmitter from 'events'
import { getSmtpImapCredential } from '../../repositories/smtpImap.repository'
import { MailParser } from 'mailparser'
import ImapMessage from '../../builder/emailData.builder'
import { findAndUpdateEmail } from '../../repositories/email.repository'
import { fileUploadBase64Data } from '../../helpers/file-upload.helper'
import { getProviderFolder } from '../../repositories/mailProviderFolder.repository'
import { emitRequest } from '../../helper/socket-request.helper'
import { updateSyncLog } from '../../repositories/mail-sync-log.repository'

export const sync = async (data) => {
  try {
    const { company, user, email } = data
    console.log('MAIL FULL_SYNC STARTED IMAP 🚀')
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
    console.log('MAIL FULL_SYNC END IMAP 🚀')
    return data
  } catch (err) {
    console.log(`ERROR INSIDE ${typeof err === 'string' ? err : JSON.stringify(err)}`)
    throw err
  }
}

export const fullSyncImap = async (data) => {
  try {
    const mainEmitter = new EventEmitter()
    // Here this variable for get box counter ,when open the folder increase the counter and base based on counter we send total number of mail count to front side
    let boxCounter = 0
    let totalNumberOfMail = 0
    let fetchedMailCount = 0

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

    const chunkBoxes = _.chunk(filteredBoxes || [], 5)

    mainEmitter.on('folderTotalMailCount', async (countData) => {
      // Increase
      boxCounter++
      totalNumberOfMail += countData.folderTotalMailCount

      if (boxCounter === filteredBoxes.length) {
        // Send total mail count
        await emitRequest({
          eventName: `mail-sync-count-${syncData.company}-${syncData.user}`,
          eventData: { totalNumberOfMail, fetchedMailCount }
        })
        await updateSyncLog(
          { user: syncData.user, providerName: 'smtp', company: syncData.company },
          { $inc: { totalNumberOfMail } }
        )
      }
    })

    mainEmitter.on('liveFetchedMailCount', async (countData) => {
      fetchedMailCount += countData.liveFetchedMailCount

      await emitRequest({
        eventName: `mail-sync-count-${data.syncData.company}-${data.syncData.user}`,
        eventData: { totalNumberOfMail, fetchedMailCount }
      })
      await updateSyncLog(
        { user: syncData.user, providerName: 'smtp', company: syncData.company },
        { $inc: { fetchedMailCount: countData.liveFetchedMailCount } }
      )
    })

    for (const boxesChunk of chunkBoxes) {
      await Promise.all(
        _.map(boxesChunk, (mailBox) =>
          getBoxesMailCount({
            ...data,
            mailBox,
            userSelectedFolder: folderData.providerSelection,
            mainEmitter
          })
        )
      )
    }

    let lastMailIdObj = { ...(syncData?.lastMailIdObj || {}) }

    console.log('***********', { lastMailIdObj }, '*************')

    for (const box of filteredBoxes) {
      const response = await imapFolderSync({
        ...data,
        mailBox: box,
        userSelectedFolder: folderData.providerSelection,
        mainEmitter
      })

      if (response) {
        lastMailIdObj = { ...lastMailIdObj, ...response }
      }
    }
    await updateSyncLog({ user: syncData.user, providerName: 'smtp', company: syncData.company }, { lastMailIdObj })
  } catch (error) {
    console.log('Error:fullSyncImap', error)
  }
}

// For this only for get boxes count
const getBoxesMailCount = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const { smtpImapCred, syncData, mailBox, mainEmitter } = data
      const searchFilter = processSearchFilterValue(syncData.query)

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
      imap.once('ready', () => imapReady())
      imap.once('close', () => imapClose())

      const imapClose = () => {
        console.log('Imap Disconnected.', mailBox)
      }

      const imapReady = async () => {
        await readORWatchInbox({ action: 'SYNC' })
        console.log(`⌛ Imap Ready ${mailBox} Done.`)
      }

      const readORWatchInbox = async ({ action }) => {
        imap.openBox(data.mailBox, false, async (err, box) => {
          if (err) {
            reject(err)
          } else {
            console.log(`Imap --${data.mailBox}-- Connected.`)
            if (action === 'SYNC') {
              imap.search(searchFilter, async (err, results) => {
                if (err) {
                  return reject(err)
                }
                // Send folder wise total count
                mainEmitter.emit('folderTotalMailCount', {
                  folderTotalMailCount: results.length
                })
                imap.end()
                console.info(`Done Mail Processing Using IMAP ${data.mailBox} 😄`)
                return resolve()
              })
              return resolve(`${data.mailBox} Sync Completed.`)
            }
          }
        })
      }
    } catch (error) {
      reject(error)
    }
  })
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
    console.log(`${data.mailBox} 📂 FOLDER SYNC STARTED IMAP  -->END`)
    return lastMailId
  } catch (err) {
    console.log(`ERROR INSIDE ${typeof err === 'string' ? err : JSON.stringify(err)}`)
    throw err
  }
}

const startImapProcess = async (data) => {
  try {
    const { smtpImapCred, syncData, mailBox, mainEmitter } = data

    const myEmitter = new EventEmitter()
    const searchFilter = processSearchFilterValue(syncData.query)
    let instances = []
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
    imap.once('ready', () => imapReady())
    imap.once('close', () => imapClose())

    const imapClose = () => {
      console.log('Imap Disconnected.', mailBox)
    }

    const imapReady = async () => {
      await readORWatchInbox({ action: 'SYNC' })
      console.log(`⌛ Imap Ready ${mailBox} Done.`)
    }

    const readORWatchInbox = async ({ action }) => {
      return new Promise((resolve, reject) => {
        imap.openBox(data.mailBox, false, async (err, box) => {
          if (err) {
            console.log('Error:openBox', err.message || err)
            myEmitter.emit('error', err)
            reject(err)
          } else {
            console.log(`Imap --${data.mailBox}-- Connected.`)
            if (action === 'SYNC') {
              await parseUnreadMessages({ boxDetail: box })
              return resolve(`${data.mailBox} Sync Completed.`)
            }
          }
        })
      })
    }

    const parseUnreadMessages = ({ boxDetail }) => {
      try {
        return new Promise((resolve, reject) => {
          let searchWithLastId
          if (syncData?.lastMailIdObj?.[mailBox]) {
            searchWithLastId = [['UID', `${syncData.lastMailIdObj[mailBox]}:*`]]
          }
          imap.search(syncData.partial && searchWithLastId ? searchWithLastId : searchFilter, async (err, results) => {
            if (err) {
              return reject(err)
            }
            instances = results
            console.log(`HELLO DATA RESULTS ${mailBox}`, results)
            const chunkArray = _.chunk(results || [], 50)

            for (const chunk of chunkArray) {
              await Promise.all(chunk.map((result) => getMessage({ uid: result })))
              // Send live fetched mail count
              mainEmitter.emit('liveFetchedMailCount', {
                liveFetchedMailCount: chunk.length
              })
            }
            // imap.end()
            console.info(`Done Mail Processing Using IMAP ${mailBox} 😄`)
            myEmitter.emit('process:end', { boxDetail })
            return resolve()
          })
        })
      } catch (error) {
        console.log('Error:parseUnreadMessages', error?.message || error)
      }
    }

    const getMessage = async ({ uid }) => {
      return new Promise((resolve, reject) => {
        try {
          imap.search([['UID', uid]], async (err, results) => {
            if (err) {
              reject(err)
            }
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
                parser.on('end', () => {
                  myEmitter.emit('message', { ...parseResult, mailBox, emailUid: uid })
                  instances = instances.filter((e) => e !== results[0])
                })
                parser.on('error', (error) => {
                  console.log('messageFetchQuery:error', error)
                  myEmitter.emit('error', error)
                })
              })

              messageFetchQuery.once('end', function () {
                console.log('Done fetching message!')
                return resolve('Done fetching message!')
              })
              messageFetchQuery.on('error', (error) => {
                console.log('Error:messageFetchQuery', error?.message || error)
                return reject(error)
              })
            } else {
              return resolve('No Result')
            }
          })
        } catch (error) {
          return reject(error)
        }
      })
    }

    return new Promise((resolve, reject) => {
      myEmitter.on('error', (err) => {
        console.log('Error:startImapProcess', err.message || err)
        reject(err)
      })
      myEmitter.on('message', async (message) => {
        try {
          const mail = new ImapMessage({ message, data: syncData, userSelectedFolder: data.userSelectedFolder })
            .setInstance()
            .getResult()
          if (message.attachments?.length) {
            mail.attachments = await setImapAttachments({
              attachments: message.attachments,
              company: mail.company,
              user: mail.user
            })
          }
          await saveMessage(mail)
          return true
        } catch (error) {
          console.log('Error:message', error.message || error)
        }
      })
      myEmitter.on('process:end', async ({ boxDetail }) => {
        console.log(`🔥 HELLO END SYNC ${mailBox}`)
        imap.end()

        return resolve({
          [mailBox]: boxDetail?.uidnext
        })
      })
    })
  } catch (error) {
    console.log('Error:startImapProcess', error)
  }
}

const processSearchFilterValue = (value) => {
  if (Array.isArray(value) && value.length > 0) {
    return value
  }

  if (typeof value === 'string') {
    return [value]
  }

  return ['UNSEEN']
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

export const saveMessage = async (message) => {
  try {
    const { folders, emailUid, ...restMessageObj } = message
    if (folders?.length) {
      await findAndUpdateEmail(
        { message_id: message.message_id, company: message.company, user: message.user },
        {
          $set: {
            ...restMessageObj
          },
          $push: { emailUid, folders: { $each: folders } }
        }
      )
    }
  } catch (error) {
    console.log('Error:saveMessage', error)
  }
}

export const setImapAttachments = async (data) => {
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
}
