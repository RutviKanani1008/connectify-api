import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  attachmentUpload,
  forwardMail,
  getContactFromMail,
  getEmailThread,
  getEmailThreadById,
  getEmails,
  getEmailsCount,
  getNextPrevMail,
  mailMoveIntoSpecificFolder,
  markAsReadAndUnRead,
  markAsStarredAndUnStarred,
  replyMail,
  sendMail
} from '../controllers/email.controller'
import { s3BucketFileUploader } from '../middlewares/fileUploader'

const email = Router()

email.get('/emails', authenticated, getEmails)
email.get('/emails/count', authenticated, getEmailsCount)
email.get('/email', authenticated, getEmailThread)
email.get('/email/thread/:id', authenticated, getEmailThreadById)
email.get('/email/next-prev-mail', authenticated, getNextPrevMail)

email.post('/email/send', authenticated, sendMail)
email.post('/email/get-contact-from-email', authenticated, getContactFromMail)
email.post('/email/reply', authenticated, replyMail)
email.post('/email/forward', authenticated, forwardMail)
email.post('/email/mark-read-unread', authenticated, markAsReadAndUnRead)
email.post('/email/mark-starred-un-starred', authenticated, markAsStarredAndUnStarred)
email.post('/email/attachment-upload', authenticated, s3BucketFileUploader, attachmentUpload)
email.post('/email/mail-move-into-specific-folder', authenticated, mailMoveIntoSpecificFolder)

export default email
