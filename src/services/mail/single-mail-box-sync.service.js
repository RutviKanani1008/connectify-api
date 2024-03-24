import Imap from 'node-imap'
import { MailParser } from 'mailparser'
import _ from 'lodash'
import EventEmitter from 'events'
import ImapMessage from '../../builder/emailData.builder'
import { setImapAttachments } from './imap-sync.service'
import { getSmtpImapCredential } from '../../repositories/smtpImap.repository'
import { getProviderFolder } from '../../repositories/mailProviderFolder.repository'
import { getSyncLog, updateSyncLog } from '../../repositories/mail-sync-log.repository'
import { saveMessage } from './imap-partial-sync.service'
import { ObjectId } from 'mongodb'

export const singleMailBoxSync = async (args) => {
  const { user, company, email } = args

  const syncData = await getSyncLog({
    user: ObjectId(user),
    providerEmail: email,
    company: ObjectId(company)
  })

  const lastMailId = await startImapProcess({ ...args, lastMailIdObj: syncData.lastMailIdObj })

  await updateSyncLog(
    { user: syncData.user, providerName: 'smtp', company: syncData.company },
    { lastMailIdObj: { ...syncData.lastMailIdObj, ...lastMailId } }
  )
}

const startImapProcess = async (args) => {
  try {
    const { mailBox, user, company, email } = args

    const smtpImapCred = await getSmtpImapCredential({
      company,
      user,
      username: email,
      type: 'imap'
    })

    const folderData = await getProviderFolder({
      email,
      company,
      mailProvider: 'smtp',
      user
    }).select({ providerSelection: 1 })

    const data = {
      smtpImapCred,
      syncData: args,
      userSelectedFolder: folderData.providerSelection,
      mailBox
    }

    const myEmitter = new EventEmitter()
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
        imap.openBox(mailBox, false, async (err, box) => {
          if (err) {
            console.log('Error:openBox', err.message || err)
            myEmitter.emit('error', err)
            reject(err)
          } else {
            console.log(`Imap --${mailBox}-- Connected.`)
            if (action === 'SYNC') {
              await parseUnreadMessages({ boxDetail: box })
              return resolve(`${mailBox} Sync Completed.`)
            }
          }
        })
      })
    }

    const parseUnreadMessages = ({ boxDetail }) => {
      try {
        return new Promise((resolve, reject) => {
          imap.search([['UID', `${data.syncData.lastMailIdObj[mailBox] + 1}:*`]], async (err, results) => {
            if (err) {
              return reject(err)
            }
            console.log(`HELLO DATA RESULTS ${mailBox}`, results)
            const chunkArray = _.chunk(results || [], 50)

            for (const chunk of chunkArray) {
              await Promise.all(chunk.map((result) => getMessage({ uid: result })))
            }
            imap.end()
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
                parser.on('end', async () => {
                  try {
                    const mail = new ImapMessage({
                      message: { ...parseResult, mailBox, emailUid: uid },
                      data: data.syncData,
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
                    await saveMessage(mail, data.userSelectedFolder)
                    return resolve('Done fetching message!')
                  } catch (error) {
                    console.log('Error:end', error.message || error)
                  }
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
