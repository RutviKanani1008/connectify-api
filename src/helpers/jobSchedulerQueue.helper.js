import Queue from 'bull'

// Queue Names
export const formSchedulerQueue = new Queue('form-scheduler')
export const massEmailSchedulerQueue = new Queue('mass-email-scheduler')
export const massEmailSchedulerChildQueue = new Queue('mass-email-scheduler-child')
export const contactMassEmailSchedulerQueue = new Queue('contact-mass-email-scheduler')
export const maasSMSSchedulerQueue = new Queue('mass-sms-scheduler')
export const deleteCompanyDataQueue = new Queue('delete-company-data')
export const mailUserQueue = new Queue('mail-users')
export const changeLogQueue = new Queue('change-log-queue')

export const createFormMailSchedulerJob = (data, delay) => {
  try {
    formSchedulerQueue.add(data, {
      delay: delay * 60 * 1000
    })
  } catch (error) {
    console.log({ error })
  }
}

/* Mass Email */
export const createMassEmilSchedulerJob = async (data, delay) => {
  try {
    const job = await massEmailSchedulerQueue.add(data, {
      delay
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}

export const createMassEmilSchedulerChildJob = async (data) => {
  try {
    const job = await massEmailSchedulerChildQueue.add(data, {
      delay: 0
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}

export const removeMassEmilSchedulerJob = async (jobId) => {
  try {
    await massEmailSchedulerQueue.removeJobs(jobId)
    console.log(`Done removing mass email job no --${jobId}`)
  } catch (error) {
    console.log('error: ', error.message)
  }
}
/* */

/* Mass SMS */
export const createMassSMSSchedulerJob = async (data, delay) => {
  try {
    const job = await maasSMSSchedulerQueue.add(data, { delay })

    return job
  } catch (error) {
    console.log({ error })
  }
}

export const removeMassSMSSchedulerJob = async (jobId) => {
  try {
    await maasSMSSchedulerQueue.removeJobs(jobId)
    console.log(`Done removing mass sms job no --${jobId}`)
  } catch (error) {
    console.log('error: ', error.message)
  }
}
/* */

// -------------------------------------
const testSchedulerQueue = new Queue('test-scheduler')

export const addDummySchedulerJob = async (data, delay) => {
  try {
    const job = await testSchedulerQueue.add(data, {
      delay: delay * 1000
    })
    console.log('Add jobId', job.id)
  } catch (error) {
    console.log('error: ', error.message)
  }
}
export const removeDummySchedulerJob = async (jobId) => {
  try {
    await testSchedulerQueue.removeJobs(jobId)
    console.log(`Done removing job no --${jobId}`)
  } catch (error) {
    console.log('error: ', error.message)
  }
}

export const testScheduler = (data, done) => {
  try {
    console.log(`Execute...........${data.id}`)
    return done()
  } catch (error) {
    console.log('error: ', error.message)
    return done()
  }
}
// -------------------------------------

export const deleteCompanyJob = async (data) => {
  try {
    const job = await deleteCompanyDataQueue.add(data)
    return job
  } catch (error) {
    console.log({ error })
  }
}

/* Mass Email */
export const createContactMassEmilSchedulerJob = async (data, delay) => {
  try {
    const job = await contactMassEmailSchedulerQueue.add(data, {
      delay
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}

export const removeContactMassEmilSchedulerJob = async (jobId) => {
  try {
    await contactMassEmailSchedulerQueue.removeJobs(jobId)
    console.log(`Done removing mass email job no --${jobId}`)
  } catch (error) {
    console.log('error: ', error.message)
  }
}
/* */

/* Change Log Job */
export const createChangeLogJob = async (data, delay) => {
  try {
    const job = await changeLogQueue.add(data, {
      delay
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}

export const removeChangeLogJob = async (jobId) => {
  try {
    await changeLogQueue.removeJobs(jobId)
  } catch (error) {
    console.log('error: ', error.message)
  }
}
/* */

/* Send Mail Job */
export const createSendMailJob = async (data, delay) => {
  try {
    const job = await mailUserQueue.add(data, {
      delay
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}

export const removeSendMailJob = async (jobId) => {
  try {
    await mailUserQueue.removeJobs(jobId)
  } catch (error) {
    console.log('error: ', error.message)
  }
}
/* */
