import { SyncLog } from '../models/syncLog'

export const getSyncLog = (params) => {
  return SyncLog.findOne(params)
}
export const getSyncLogs = (params) => {
  return SyncLog.find(params)
}

export const createSyncLog = (data) => {
  return SyncLog.create(data)
}

export const deleteSyncLogRepo = (params) => {
  return SyncLog.delete(params)
}

export const updateSyncLog = (params, data) => {
  return SyncLog.findOneAndUpdate(params, data, { new: true })
}
