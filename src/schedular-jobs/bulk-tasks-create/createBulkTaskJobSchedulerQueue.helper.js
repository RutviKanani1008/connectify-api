import Queue from 'bull'

// Create Buldk tasks
export const createBulkTasksSchedulerQueue = new Queue('create-bulk-task')
export const createBulkTasksSchedulerChildQueue = new Queue('create-bulk-task-child')

/* Create Buldk tasks */
export const createBulkTasksSchedulerJob = async (data, delay) => {
  try {
    const job = await createBulkTasksSchedulerQueue.add(data, {
      delay
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}

export const createBulkTasksSchedulerChildJob = async (data) => {
  try {
    const job = await createBulkTasksSchedulerChildQueue.add(data, {
      delay: 0
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}
