import Queue from 'bull'

// Create Buldk Notes
export const createBulkNoteSchedulerQueue = new Queue('create-bulk-note')
export const createBulkNoteSchedulerChildQueue = new Queue('create-bulk-note-child')

/* Create Buldk Note */
export const createBulkNotesSchedulerJob = async (data, delay) => {
  try {
    const job = await createBulkNoteSchedulerQueue.add(data, {
      delay
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}

export const createBulkNotesSchedulerChildJob = async (data) => {
  try {
    const job = await createBulkNoteSchedulerChildQueue.add(data, {
      delay: 0
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}
