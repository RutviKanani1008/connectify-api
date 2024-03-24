import nodeCron from 'node-cron'
import fs from 'fs'
import path from 'path'
import { deleteSessionCronHelper } from './deleteSession.cron'
import { invoiceCronJob } from '../controllers/invoiceCronJob.controller'
import { SnoozedUserTask } from '../models/snoozeUserTask'
import { taskCronJob } from '../controllers/task.controller'
import { importContactCronJob } from '../controllers/importContacts.controller'

// ** Expired session data delete every 24 hours **
nodeCron.schedule('0 0 0 * * *', deleteSessionCronHelper)

nodeCron.schedule('0 0 0 * * *', invoiceCronJob)

nodeCron.schedule('0 0 0 * * *', () => {
  fs.readdir(`${path.join(__dirname, './public')}/files`, (err, files) => {
    if (err) throw err
    console.log({ files })

    for (const file of files) {
      fs.unlink(path.join(`${path.join(__dirname, './public')}/files`, file), (err) => {
        if (err) throw err
      })
    }
  })
})

// Task Snooze Reset
nodeCron.schedule('1 * * * * *', async () => {
  await SnoozedUserTask.deleteMany({ snoozeUntil: { $lte: new Date() } })
})

nodeCron.schedule('0 12 * * *', taskCronJob)

nodeCron.schedule('*/5 * * * * *', () => {
  // syncEmailCron()
})

// Imported contact
nodeCron.schedule('0 0 * * *', importContactCronJob)
