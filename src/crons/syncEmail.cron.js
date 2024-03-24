import { getSyncLogs, updateSyncLog } from '../repositories/mail-sync-log.repository'
import { syncEmailCronQueue, syncEmailJob } from '../schedular-jobs/smtp-imap/syncWatchQueue'

export const syncEmailCron = async () => {
  console.log('****** Email cron run every 1 minutes ******')
  const syncData = await getSyncLogs({
    providerName: 'smtp'
  }).select({
    isFullSyncRunning: 1,
    isPartialSyncRunning: 1,
    syncingJobId: 1,
    totalNumberOfMail: 1,
    fetchedMailCount: 1,
    company: 1,
    providerEmail: 1,
    user: 1,
    currentMailSyncCronJobId: 1
  })

  console.log('-------------', syncData)

  for (const obj of syncData) {
    const fullSyncJob = await syncEmailCronQueue.getJob(obj?.syncingJobId)
    const fullSyncJobIsFailed = await fullSyncJob?.isFailed()
    const fullSyncJobIsCompleted = await fullSyncJob?.isCompleted()
    const cronJob = await syncEmailCronQueue.getJob(obj?.currentMailSyncCronJobId)
    const cronJobIsFailed = await cronJob?.isFailed()
    const cronJobIsCompleted = await cronJob?.isCompleted()

    if (
      (!fullSyncJob || fullSyncJobIsFailed || fullSyncJobIsCompleted) &&
      (!cronJob || cronJobIsFailed || cronJobIsCompleted)
    ) {
      console.log('-------------Sync Mail Cron-----------------')
      const jobData = await syncEmailJob({
        providerName: 'smtp',
        user: obj.user,
        company: obj.company,
        partial: true,
        email: obj.providerEmail
      })
      await updateSyncLog(
        {
          user: obj.user,
          providerName: 'smtp',
          company: obj.company
        },
        {
          currentMailSyncCronJobId: jobData?.id
        }
      )
    }
  }
}
