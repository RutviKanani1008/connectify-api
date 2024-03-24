import Queue from 'bull'

// Queue Names
export const importProductsSchedulerQueue = new Queue('import-products')
export const importProductsSchedulerChildQueue = new Queue('import-products-child')

/* Import Products */
export const createImportProductsSchedulerJob = async (data, delay) => {
  try {
    const job = await importProductsSchedulerQueue.add(data, {
      delay
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}

export const createImportProductsSchedulerChildJob = async (data) => {
  try {
    const job = await importProductsSchedulerChildQueue.add(data, {
      delay: 0
    })
    return job
  } catch (error) {
    console.log({ error })
  }
}
