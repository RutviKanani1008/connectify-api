// ==================== Packages =======================
import { Router } from 'express'
// ====================================================
import {
  cancelScheduledMassEmailDetail,
  getScheduledMassEmails,
  getSpecificScheduledMassEmail,
  getSpecificScheduledMassEmailContacts,
  updateScheduledMassEmailDetail
} from '../controllers/scheduledMassEmail.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const scheduledMassEmail = Router()

scheduledMassEmail.get('/scheduled-mass-email', authenticated, getScheduledMassEmails)
scheduledMassEmail.get('/scheduled-mass-email/:id', authenticated, getSpecificScheduledMassEmail)
scheduledMassEmail.get('/scheduled-mass-email/:id/contacts', authenticated, getSpecificScheduledMassEmailContacts)

scheduledMassEmail.put('/scheduled-mass-email/:id', authenticated, updateScheduledMassEmailDetail)
scheduledMassEmail.put('/scheduled-mass-email/cancel/:id', authenticated, cancelScheduledMassEmailDetail)

export default scheduledMassEmail
