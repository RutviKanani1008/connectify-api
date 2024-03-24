import { defaultConfig } from '../constants/email.constant'
import generalResponse from '../helpers/generalResponse.helper'
import { deleteSyncLogRepo, getSyncLog, updateSyncLog } from '../repositories/mail-sync-log.repository'
import { deleteMailProviderFolderRepo } from '../repositories/mailProviderFolder.repository'
import {
  addSmtpImapData,
  connectionVerifiers,
  deleteSmtpImapCredentialRepo,
  findSmtpConfigs,
  getSmtpImapCredential,
  getSmtpImapCredentials,
  updateSmtpImapData
} from '../repositories/smtpImap.repository'
import {
  removeImapConnectionJob,
  removeImapMailJob,
  syncAndWatchImapMailJob,
  syncAndWatchImapMailQueue,
  watchImapMailJob
} from '../schedular-jobs/smtp-imap/syncWatchQueue'

export const connectSmtpImap = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { email, password, smtp, imap, api_purpose } = req.body

    const isExist = await getSmtpImapCredential({ email, password, isMapped: true }).select({ _id: 1 })

    if (!isExist) {
      let config = defaultConfig
      let message = 'We have been unable to locate imap credentials for this email. please fill them manually'

      const toast = false
      let responseObject = {
        smtp: false,
        imap: false,
        message: ''
      }

      if (api_purpose === 'manual') {
        config = {
          smtp: {
            ...smtp,
            type: 'smtp'
          },
          imap: {
            ...imap,
            type: 'imap'
          }
        }
      } else {
        config = await findSmtpConfigs({ email, password, smtpHost: smtp.host, imapHost: imap.host })
      }

      responseObject = await connectionVerifiers({
        config
      })

      if (responseObject?.imap && responseObject?.smtp) {
        if (api_purpose === 'manual') {
          await addSmtpImapData({
            config,
            company: currentUser.company,
            userId: currentUser._id
          })
        }
        message = 'Connection established successfully'
      } else if (responseObject?.imap === false || !responseObject?.smtp) {
        if (api_purpose === 'manual') {
          throw new Error(
            'Your smtp or imap credentials are not valid. please re-check your credentials or try with other credentials or something went wrong.'
          )
        } else {
          throw new Error('Connection not establish')
        }
      }
      responseObject.message = message

      if (config.imap.host && config.smtp.host) {
        return generalResponse(res, { ...responseObject, config }, 'success', 'success', toast, 200)
      } else {
        return generalResponse(res, null, 'Invalid host.', 'error', toast, 200)
      }
    } else {
      throw new Error('This email is already associated with another account.')
    }
  } catch (error) {
    console.log('ConnectSmtpImap:API', { error })
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const updateSmtpImap = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { password } = req.body

    let config = defaultConfig
    let message = 'We have been unable to locate imap credentials'

    let toast = false
    let responseObject = {
      smtp: false,
      imap: false,
      message: ''
    }

    const connectedAccount = await getSmtpImapCredentials({
      user: currentUser._id,
      company: currentUser.company,
      type: { $in: ['smtp', 'imap'] }
    }).select({ username: 1, type: 1, host: 1, port: 1 })

    const smtpConfig = connectedAccount.find((c) => c.type === 'smtp')
    const imapConfig = connectedAccount.find((c) => c.type === 'imap')

    if (smtpConfig && imapConfig) {
      config = {
        smtp: {
          type: smtpConfig.type,
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: false,
          auth: { user: smtpConfig.username, pass: password }
        },
        imap: {
          type: imapConfig.type,
          host: imapConfig.host,
          port: imapConfig.port,
          secure: false,
          auth: { user: imapConfig.username, pass: password }
        }
      }
      responseObject = await connectionVerifiers({ config })
    }

    if (responseObject?.imap && responseObject?.smtp) {
      await updateSmtpImapData({
        config,
        company: currentUser.company,
        userId: currentUser._id
      })

      toast = true
      message = 'Connection updated successfully'
    } else if (responseObject?.imap === false || !responseObject?.smtp) {
      throw new Error(
        'Your smtp or imap credentials are not valid. please re-check your credentials or try with other credentials or something went wrong.'
      )
    }

    responseObject.message = message

    if (config.imap.host && config.smtp.host) {
      return generalResponse(res, null, message, 'success', toast, 200)
    } else {
      return generalResponse(res, null, 'Invalid host.', 'error', toast, 200)
    }
  } catch (error) {
    console.log('ConnectSmtpImap:API', { error })
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const watch = async (req, res) => {
  try {
    const data = await watchImapMailJob()
    return generalResponse(res, data, 'success', 'success', true, 200)
  } catch (error) {
    console.log('Error:watch', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const refreshMail = async (req, res) => {
  try {
    const { _id: userId, company } = req.headers.authorization
    const { email } = req.body

    const syncData = await getSyncLog({
      user: userId,
      providerName: 'smtp',
      providerEmail: email,
      company
    })

    const job = await syncAndWatchImapMailQueue.getJob(syncData?.syncingJobId)
    const isFailed = await job?.isFailed()
    const isCompleted = await job?.isCompleted()

    if (!job || isFailed || isCompleted) {
      const jobData = await syncAndWatchImapMailJob({
        providerName: 'smtp',
        user: userId,
        company,
        partial: true,
        email
      })

      // await watchImapMailJob({
      //   providerName: 'smtp',
      //   user: userId,
      //   company,
      //   partial: true,
      //   email
      // })

      await updateSyncLog(
        {
          user: userId,
          providerName: 'smtp',
          company
        },
        {
          syncingJobId: jobData?.id
        }
      )
    }

    return generalResponse(res, null, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error:refreshMail', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const setMailWatcher = async (req, res) => {
  try {
    const { _id: userId, company } = req.headers.authorization
    const { email } = req.body

    await watchImapMailJob({
      providerName: 'smtp',
      user: userId,
      company,
      partial: true,
      email
    })

    return generalResponse(res, null, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error:setMailWatcher', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getConnectedSmtpAccounts = async (req, res) => {
  try {
    const { _id: userId, company } = req.headers.authorization
    const connectedAccounts = await getSmtpImapCredentials({
      user: userId,
      company,
      type: 'smtp',
      isMapped: true
    }).select({
      username: 1
    })
    return generalResponse(res, connectedAccounts, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error:getConnectedSmtpAccounts', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getConnectedSmtpAccount = async (req, res) => {
  try {
    const { _id: userId, company } = req.headers.authorization

    const connectedAccount = await getSmtpImapCredentials({
      user: userId,
      company,
      type: { $in: ['smtp', 'imap'] },
      isMapped: true
    }).select({ username: 1, type: 1, host: 1, port: 1 })

    const smtpConfig = connectedAccount.find((c) => c.type === 'smtp')
    const imapConfig = connectedAccount.find((c) => c.type === 'imap')

    return generalResponse(res, { smtp: smtpConfig, imap: imapConfig }, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error:getConnectedSmtpAccount', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteSmtpImapCredential = async (req, res) => {
  try {
    const { _id: userId, company } = req.headers.authorization
    const { email } = req.query

    const connectedAccounts = await deleteSmtpImapCredentialRepo({
      user: userId,
      company,
      type: { $in: ['smtp', 'imap'] }
    })

    // Delete all sync log for this user
    await deleteSyncLogRepo({
      company,
      user: userId
    })

    // Delete mapped folder
    await deleteMailProviderFolderRepo({
      user: userId,
      company
    })

    // Remove all email related to this email
    await removeImapMailJob({
      providerName: 'smtp',
      user: userId,
      company
    })

    await removeImapConnectionJob({ company, user: userId, email })

    return generalResponse(res, connectedAccounts, 'Account removed successfully.', 'success', true, 200)
  } catch (error) {
    console.log('Error:deleteSmtpImapCredential', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const isMailSyncing = async (req, res) => {
  try {
    const { _id: userId, company } = req.headers.authorization

    let syncData = await getSyncLog({
      user: userId,
      providerName: 'smtp',
      company
    }).select({
      isFullSyncRunning: 1,
      isPartialSyncRunning: 1,
      syncingJobId: 1,
      totalNumberOfMail: 1,
      fetchedMailCount: 1
    })

    const job = await syncAndWatchImapMailQueue.getJob(syncData?.syncingJobId)

    const isFailed = await job?.isFailed()
    const isCompleted = await job?.isCompleted()

    console.log({ isFailed, isCompleted }, 'job.id', job?.id)

    if (!job || isFailed || isCompleted) {
      syncData = await updateSyncLog(
        { user: userId, providerName: 'smtp', company },
        { isFullSyncRunning: false, isPartialSyncRunning: false }
      ).select({
        isFullSyncRunning: 1,
        isPartialSyncRunning: 1,
        totalNumberOfMail: 1,
        fetchedMailCount: 1
      })
    }

    return generalResponse(res, syncData, 'success', 'success', false, 200)
  } catch (error) {
    console.log('Error:isMailSyncing', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
