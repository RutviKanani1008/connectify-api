import { MassMailLog } from '../models/MassMailLog'

export const createMassMailLogs = (data) => {
  return MassMailLog.insertMany(data)
}
