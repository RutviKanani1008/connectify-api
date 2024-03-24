import generalResponse from '../helpers/generalResponse.helper'
import {
  deleteMailProviderFolderRepo,
  findAndUpdateMailProviderFolder,
  getProviderFolder
} from '../repositories/mailProviderFolder.repository'
import { updateSmtpImapCredential } from '../repositories/smtpImap.repository'
import { syncAndWatchImapMailJob } from '../schedular-jobs/smtp-imap/syncWatchQueue'
import { createORUpdateSync } from '../services/mail/mail-sync-process.service'
import { ObjectId } from 'mongodb'

export const addMailProviderFolder = async (req, res) => {
  try {
    const { _id: userId, company } = req.headers.authorization
    const { email, mailFolders } = req.body

    await findAndUpdateMailProviderFolder(
      {
        user: userId,
        email,
        company,
        mailProvider: 'smtp'
      },
      {
        user: userId,
        email,
        company,
        mailProvider: 'smtp',
        providerSelection: mailFolders
      }
    )

    await updateSmtpImapCredential(
      {
        type: 'smtp',
        company: ObjectId(company),
        user: ObjectId(userId),
        username: email
      },
      {
        isMapped: true
      }
    )

    const job = await syncAndWatchImapMailJob({
      providerName: 'smtp',
      user: userId,
      company,
      partial: false,
      email,
      days: 30
    })

    if (job.id) {
      await createORUpdateSync({
        providerName: 'smtp',
        user: userId,
        company,
        partial: false,
        email,
        days: 30,
        jobId: job.id
      })
    } else {
      throw new Error('Something went wrong.')
    }

    return generalResponse(res, null, 'Smtp-Imap connected successfully.', 'success', true, 200)
  } catch (error) {
    console.log('Error:addMailProviderFolder', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const getMailProviderFolder = async (req, res) => {
  try {
    const { _id: user, company } = req.headers.authorization
    const folderData = await getProviderFolder({
      company,
      mailProvider: 'smtp',
      user
    }).select({ providerSelection: 1 })
    return generalResponse(res, folderData, 'Mail folder fetched successfully.', 'success', false, 200)
  } catch (error) {
    console.log('Error:getMailProviderFolder', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const deleteMailProviderFolder = async (req, res) => {
  try {
    const { _id: userId, company } = req.headers.authorization
    const { provider, email } = req.body
    const data = await deleteMailProviderFolderRepo({
      user: userId,
      email,
      company,
      mailProvider: provider
    })
    return generalResponse(res, data, 'success', 'success', true, 200)
  } catch (error) {
    console.log('Error:deleteMailProviderFolder', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}
