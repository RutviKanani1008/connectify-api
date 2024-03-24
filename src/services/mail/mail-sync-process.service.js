import { createSyncLog, getSyncLog, updateSyncLog } from '../../repositories/mail-sync-log.repository'
import { addDays, format, subDays } from 'date-fns'
import { sync } from './imap-sync.service'
import { emitRequest } from '../../helper/socket-request.helper'
import { removeWatcher, watch } from './imap-watch.service'
import { partialSync } from './imap-partial-sync.service'
import { watchImapMailJob } from '../../schedular-jobs/smtp-imap/syncWatchQueue'
import { markReadUnreadHelper } from '../../helper/email.helper'

export const syncMails = async (data, done) => {
  const { providerName, user, company, email, partial } = data
  let job = null
  try {
    const syncLog = await createORUpdateSync(data)
    delete data.days

    if (!syncLog) {
      return
    }

    console.log('Now Syncing. Send to Queue')
    const queueMessage = {
      ...data,
      syncLogId: syncLog.id,
      query: syncLog.queueMessage.query,
      partial,
      lastMailIdObj: syncLog.lastMailIdObj
    }
    console.log('[MQ]: Sending Message.')

    await updateSyncLog(
      { user, providerName, providerEmail: email, company },
      { ...(partial ? { isPartialSyncRunning: true } : { isFullSyncRunning: true }) }
    )
    if (partial) {
      await partialSync(queueMessage)
    } else {
      await sync(queueMessage)
      job = await watchImapMailJob({
        providerName: 'smtp',
        user,
        company,
        partial: true,
        email
      })
      if (!job?.id) {
        console.log('---------------Error:watchImapMailJob-initial---------------')
      }
    }
    await updateSyncLog(
      { user, providerName, providerEmail: email, company },
      { isFullSyncRunning: false, isPartialSyncRunning: false, ...(job?.id && { mailWatcherJobId: job.id }) }
    )
    await emitRequest({
      eventName: `mail-sync-${data.company}-${data.user}`,
      eventData: { partial, done: true }
    })
    console.log('[MQ]: Message Published.')

    return done()
  } catch (err) {
    await updateSyncLog({ user, providerName, company }, { isFullSyncRunning: false, isPartialSyncRunning: false })
    console.log(`ERROR:syncMails ${typeof err === 'string' ? err : JSON.stringify(err)}`)
    console.log({ err })
    return done()
  }
}

export const watchMails = async (data, done) => {
  const { providerName, user, company, partial } = data
  try {
    // update or create mailSync
    const syncLog = await createORUpdateSync(data)
    delete data.days

    if (!syncLog) {
      return
    }

    console.log('Now Syncing. Send to Queue')
    const queueMessage = {
      ...data,
      syncLogId: syncLog.id,
      query: syncLog.queueMessage.query,
      partial,
      lastMailIdObj: syncLog.lastMailIdObj
    }
    console.log('[MQ-Watcher]: Sending Message.-->Start')

    await updateSyncLog(
      { user, providerName, company },
      { ...(partial ? { isPartialSyncRunning: true } : { isFullSyncRunning: true }) }
    )

    await watch(queueMessage)

    await updateSyncLog({ user, providerName, company }, { isFullSyncRunning: false, isPartialSyncRunning: false })

    console.log('[MQ-Watcher]: Message Published.-->End')
    return done()
  } catch (err) {
    await updateSyncLog({ user, providerName, company }, { isFullSyncRunning: false, isPartialSyncRunning: false })
    console.log('ERROR:watchMails', err)
    return done()
  }
}

export const readMails = async (data, done) => {
  const { company, email, mailbox, read, threadIds, user } = data
  try {
    console.log('[ReadMails]: Queue-->Start')
    await markReadUnreadHelper({
      company,
      email,
      mailbox,
      read,
      threadIds,
      user
    })
    console.log('[ReadMails]: Queue-->End')
    return done()
  } catch (err) {
    console.log('ERROR:readMails', err)
    return done()
  }
}

export const removeWatchMails = async (data, done) => {
  try {
    removeWatcher(data)
    return done()
  } catch (err) {
    console.log('ERROR:removeWatchMails', err)
    return done()
  }
}

export const createORUpdateSync = async (data) => {
  try {
    const { providerName, user, company, partial, email, jobId } = data
    const days = data.days
    if (data.days) {
      delete data.days
    }

    const syncData = await getSyncLog({
      user,
      providerName,
      providerEmail: email,
      company
    })

    if (!syncData) {
      const { query, syncStartDate } = getMailSyncQuery?.({ days }) || {}

      return createSyncLog({
        isSynced: true,
        user,
        company,
        providerName,
        providerEmail: email,
        queueMessage: { ...data, query },
        syncedDate: new Date(),
        syncStartDate,
        syncingJobId: jobId
      })
    }

    const { query, syncStartDate } = getMailSyncQuery?.({ days, syncLog: partial ? syncData : undefined }) || {}

    return updateSyncLog(
      { _id: syncData._id },
      { syncStartDate, syncedDate: new Date(), queueMessage: { ...data, query }, syncingJobId: jobId }
    )
  } catch (error) {
    console.log('Error:createORUpdateSync', error)
  }
}

export const getMailSyncQuery = (data) => {
  try {
    const { days, syncLog } = data

    const now = new Date()
    const dateFormat = 'PP'
    const syncStartDate = syncLog ? syncLog.syncedDate : subDays(now.getTime(), days)

    const mailSyncStartDateString = format(syncStartDate, dateFormat)

    return {
      syncStartDate,
      query: ['ALL', ['SINCE', `${mailSyncStartDateString}`], ['BEFORE', `${format(addDays(now, 1), dateFormat)}`]]
    }
  } catch (error) {
    console.log('Error:getMailSyncQuery', error)
  }
}
