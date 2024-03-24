import Queue from 'bull'

export const notificationQueue = new Queue('notification')

export const sendNotificationJob = async (data) => {
  try {
    const job = await notificationQueue.add(data)
    return job
  } catch (error) {
    console.log('Error:sendNotificationJob', error)
  }
}
