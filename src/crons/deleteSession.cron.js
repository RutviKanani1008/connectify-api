import { deleteUserSession } from '../repositories/userSession.repository'

export const deleteSessionCronHelper = async () => {
  await deleteUserSession({ expireTime: { $lt: new Date() } })
}
