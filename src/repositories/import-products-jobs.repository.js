import { ImportProductsJob } from '../models/import-products-job'

const findImportProductsJob = (params) => {
  return ImportProductsJob.findOne(params)
}

const findAllImportProductsJob = (params) => {
  return ImportProductsJob.find(params).sort({ createdAt: -1 })
}

const createImportProductsJob = (data) => {
  return ImportProductsJob.create(data)
}

const updateImportProductsJob = (search, updateValue) => {
  return ImportProductsJob.updateOne(search, updateValue)
}

const deleteImportProductsJob = (importProductsJob) => {
  return ImportProductsJob.delete(importProductsJob)
}

export {
  createImportProductsJob,
  findImportProductsJob,
  findAllImportProductsJob,
  updateImportProductsJob,
  deleteImportProductsJob
}
