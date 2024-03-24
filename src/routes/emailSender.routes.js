import { Router } from 'express'
import {
  addEmailSender,
  changeEmailSenderStatus,
  getSenderEmail,
  handleDeleteEmailSender,
  reSendEmail,
  verifyEmailSender
} from '../controllers/emailSender.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const router = Router()

router.post('/email-sender', authenticated, addEmailSender)

router.post('/email-resend-verify', authenticated, reSendEmail)

router.get('/email-sender', authenticated, getSenderEmail)

router.delete('/email-sender/:id', authenticated, handleDeleteEmailSender)

router.put('/email-sender/verify', verifyEmailSender)

router.put('/email-sender-status/:id', authenticated, changeEmailSenderStatus)

export default router
