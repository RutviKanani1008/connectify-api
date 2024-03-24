import { ChangeLog } from '../models/changeLog'

export const findAllChangeLogs = (query) => ChangeLog.find(query).sort({ createdAt: -1 })

export const findChangeLog = (id) => ChangeLog.findOne(id)

export const latestChangeLog = () => ChangeLog.findOne().sort({ createdAt: -1 })

export const createChangeLog = (logData) => ChangeLog.create(logData)

export const updateChangeLog = (id, logData) => ChangeLog.updateOne(id, logData)

export const countChangeLog = (params) => ChangeLog.count(params)

export const deleteChangeLog = (id) => ChangeLog.delete(id)
