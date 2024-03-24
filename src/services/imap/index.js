/* eslint-disable no-async-promise-executor */
import { connectImap, getBoxes } from '../mail/imap-sync.service'

export const verifyImapConnection = (formImapObj, options) => {
  return new Promise(async (resolve, reject) => {
    try {
      const imap = await connectImap({
        user: formImapObj.auth?.user,
        password: formImapObj.auth.pass,
        host: formImapObj?.host,
        port: formImapObj?.port
      })

      const boxes = await getBoxes(imap)
      imap.end()
      resolve(boxes)
    } catch (error) {
      reject(error)
    }
  })
}
