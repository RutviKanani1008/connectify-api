import Queue from 'bull'

export const syncAndWatchImapMailQueue = new Queue('sync-watch-queue')
export const syncEmailCronQueue = new Queue('sync-email-cron')
export const watchImapMailQueue = new Queue('watch-queue')
export const watchImapMailRemoveQueue = new Queue('watch-remove-queue')
export const removeMailQueue = new Queue('remove-mails')
export const readMailQueue = new Queue('read-mails')

export const syncAndWatchImapMailJob = async (data) => {
  try {
    const job = await syncAndWatchImapMailQueue.add(data)
    return job
  } catch (error) {
    console.log('Error:syncAndWatchImapMailJob', error)
  }
}

export const syncEmailJob = async (data) => {
  try {
    const job = await syncEmailCronQueue.add(data)
    return job
  } catch (error) {
    console.log('Error:syncEmailJob', error)
  }
}

export const watchImapMailJob = async (data) => {
  try {
    const job = await watchImapMailQueue.add(data)
    return job
  } catch (error) {
    console.log('Error:watchImapMailJob', error)
  }
}
export const removeImapConnectionJob = async (data) => {
  try {
    const job = await watchImapMailRemoveQueue.add(data)
    return job
  } catch (error) {
    console.log('Error:removeImapConnectionJob', error)
  }
}

export const removeImapMailJob = async (data) => {
  try {
    const job = await removeMailQueue.add(data)
    return job
  } catch (error) {
    console.log('Error:removeImapMailJob', error)
  }
}

export const readMailJob = async (data) => {
  try {
    const job = await readMailQueue.add(data)
    return job
  } catch (error) {
    console.log('Error:readMailJob', error)
  }
}
