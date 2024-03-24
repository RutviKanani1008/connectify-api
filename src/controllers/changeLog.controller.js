import {
  findAllChangeLogs,
  createChangeLog,
  findChangeLog,
  updateChangeLog,
  deleteChangeLog,
  latestChangeLog
} from '../repositories/changeLog.repository'
import generalResponse from '../helpers/generalResponse.helper'
import { createChangeLogJob } from '../helpers/jobSchedulerQueue.helper'

export const getAllChangeLogs = async (req, res) => {
  try {
    const changeLogs = await findAllChangeLogs(req.query)
    return generalResponse(res, changeLogs, '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const getLatestChangeLog = async (req, res) => {
  try {
    const changeLog = await latestChangeLog()
    return generalResponse(res, changeLog, '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const getSpecificChangeLog = async (req, res) => {
  try {
    const changeLog = await findChangeLog({ _id: req.params.id })
    return generalResponse(res, changeLog, '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const addChangeLog = async (req, res) => {
  try {
    const newChangeLog = await createChangeLog(req.body)
    await createChangeLogJob(newChangeLog)

    return generalResponse(res, newChangeLog, '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const updateChangeLogById = async (req, res) => {
  try {
    delete req.body._id
    await updateChangeLog({ _id: req.params.id }, req.body)
    return generalResponse(res, '', '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const deleteChangeLogDetail = async (req, res) => {
  try {
    await deleteChangeLog({ _id: req.params.id })
    return generalResponse(res, '', '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
