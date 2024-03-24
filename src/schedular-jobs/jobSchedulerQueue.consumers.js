import { deleteCompanyRemainingData } from '../controllers/company.controller'
import dbConnection from '../db/connection'
import {
  changeGroupContactsSchedulerChildQueue,
  changeGroupContactsSchedulerQueue
} from './bulk-change-group/changeContactsGroupJobSchedulerQueue.helper'
import { changeContactsGroup, changeContactsGroupChild } from './bulk-change-group/changeContactsGroupQueue.helper'
import {
  contactMassEmailScheduler,
  formMailScheduler,
  massEmailScheduler,
  massEmailSchedulerChild,
  massSMSScheduler
} from '../helpers/formResponse.helper'
import {
  importContactsSchedulerChildQueue,
  importContactsSchedulerQueue
} from './import-contacts/importContactsJobSchedulerQueue.helper'
import {
  importProductsSchedulerChildQueue,
  importProductsSchedulerQueue
} from './import-products/importProductsJobSchedularQueue.helper'
import { importContactScheduler, importContactSchedulerChild } from './import-contacts/importContactsQueue.helper'
import {
  contactMassEmailSchedulerQueue,
  deleteCompanyDataQueue,
  formSchedulerQueue,
  maasSMSSchedulerQueue,
  massEmailSchedulerQueue,
  massEmailSchedulerChildQueue,
  changeLogQueue,
  mailUserQueue
} from '../helpers/jobSchedulerQueue.helper'
import {
  createBulkTasksSchedulerChildQueue,
  createBulkTasksSchedulerQueue
} from './bulk-tasks-create/createBulkTaskJobSchedulerQueue.helper'
import { createBulkTasks, createBulkTasksChild } from './bulk-tasks-create/createBulkTaskQueue.helper'
import {
  createBulkNoteSchedulerChildQueue,
  createBulkNoteSchedulerQueue
} from './bulk-notes-create/createBulkTaskJobSchedulerQueue.helper'
import { createBulkNotes, createBulkNotesChild } from './bulk-notes-create/createBulkTaskQueue.helper'
import {
  readMailQueue,
  removeMailQueue,
  syncAndWatchImapMailQueue,
  syncEmailCronQueue,
  watchImapMailQueue,
  watchImapMailRemoveQueue
} from './smtp-imap/syncWatchQueue'
import { readMails, removeWatchMails, syncMails, watchMails } from '../services/mail/mail-sync-process.service'
import { changeLogProcess, sendMailProcess } from './change-log/changeLogQueue.helper'
import { removeMailProcess } from '../services/mail/remove-mail.service'
import { importProductScheduler, importProductSchedulerChild } from './import-products/importProductsQueue.helper'
import { initialMailWatcherSet } from '../helper/email.helper'
import { notificationQueue } from './notification'
import { sendNotificationConsumer } from '../services/notification'

const main = async () => {
  try {
    dbConnection()
    formSchedulerQueue.process((job, done) => formMailScheduler(job.data, done))

    massEmailSchedulerQueue.process((job, done) => massEmailScheduler(job.data, done))

    massEmailSchedulerChildQueue.process((job, done) => massEmailSchedulerChild(job.data, done))

    maasSMSSchedulerQueue.process((job, done) => massSMSScheduler(job.data, done))

    deleteCompanyDataQueue.process((job, done) => deleteCompanyRemainingData(job.data, done))

    contactMassEmailSchedulerQueue.process((job, done) => contactMassEmailScheduler(job.data, done))

    importContactsSchedulerQueue.process((job, done) => importContactScheduler(job.data, done))

    importContactsSchedulerChildQueue.process((job, done) => importContactSchedulerChild(job.data, done))

    importProductsSchedulerQueue.process((job, done) => importProductScheduler(job.data, done))

    importProductsSchedulerChildQueue.process((job, done) => importProductSchedulerChild(job.data, done))

    changeGroupContactsSchedulerQueue.process((job, done) => changeContactsGroup(job.data, done))

    changeGroupContactsSchedulerChildQueue.process((job, done) => changeContactsGroupChild(job.data, done))

    createBulkTasksSchedulerQueue.process((job, done) => createBulkTasks(job.data, done))

    createBulkTasksSchedulerChildQueue.process((job, done) => createBulkTasksChild(job.data, done))

    createBulkNoteSchedulerQueue.process((job, done) => createBulkNotes(job.data, done))

    createBulkNoteSchedulerChildQueue.process((job, done) => createBulkNotesChild(job.data, done))

    syncAndWatchImapMailQueue.process((job, done) => syncMails(job.data, done))

    syncEmailCronQueue.process((job, done) => syncMails(job.data, done))

    watchImapMailQueue.process((job, done) => watchMails(job.data, done))

    readMailQueue.process((job, done) => readMails(job.data, done))

    watchImapMailRemoveQueue.process((job, done) => removeWatchMails(job.data, done))

    removeMailQueue.process((job, done) => removeMailProcess(job.data, done))

    changeLogQueue.process((job, done) => changeLogProcess(job.data, done))

    mailUserQueue.process((job, done) => sendMailProcess(job.data, done))

    notificationQueue.process((job, done) => sendNotificationConsumer(job.data, done))

    // Here set watcher for live mail watching
    await initialMailWatcherSet()
  } catch (error) {
    console.log('Error:main-consumer', error)
  }
}

main()
