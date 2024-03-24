import { ImportContactsJob } from '../models/import-contacts-job'

const findImportContactsJob = (params) => {
  return ImportContactsJob.findOne(params)
}

const findAllImportContactsJob = (params) => {
  return ImportContactsJob.find(params).sort({ createdAt: -1 })
}

const createImportContactsJob = (data) => {
  return ImportContactsJob.create(data)
}

const updateImportContactsJob = (search, updateValue) => {
  return ImportContactsJob.updateOne(search, updateValue)
}

const deleteImportContactsJob = (importContactsJob) => {
  return ImportContactsJob.delete(importContactsJob)
}

export {
  createImportContactsJob,
  findImportContactsJob,
  findAllImportContactsJob,
  updateImportContactsJob,
  deleteImportContactsJob
}
