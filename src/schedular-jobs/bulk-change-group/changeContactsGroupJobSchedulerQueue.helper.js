import Queue from 'bull'

// Change Groups
export const changeGroupContactsSchedulerQueue = new Queue('change-contacts-group')
export const changeGroupContactsSchedulerChildQueue = new Queue('change-contacts-group-child')

/* Change Group */
export const createChangeContactsGroupSchedulerJob = async (data, delay) => {
  try {
    const job = await changeGroupContactsSchedulerQueue.add(data, {
      delay
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}

export const createChangeContactsGroupSchedulerChildJob = async (data) => {
  try {
    const job = await changeGroupContactsSchedulerChildQueue.add(data, {
      delay: 0
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}
