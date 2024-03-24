import Queue from 'bull'

// Queue Names
export const importContactsSchedulerQueue = new Queue('import-contacts')
export const importContactsSchedulerChildQueue = new Queue('import-contacts-child')

/* Import Contacts */
export const createImportContactsSchedulerJob = async (data, delay) => {
  try {
    const job = await importContactsSchedulerQueue.add(data, {
      delay
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}

export const createImportContactsSchedulerChildJob = async (data) => {
  try {
    const job = await importContactsSchedulerChildQueue.add(data, {
      delay: 0
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}