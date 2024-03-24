import { Router } from 'express'
import {
  getAllScheduledMassSMS,
  getSpecificScheduledMassSMS,
  cancelScheduledMassSMSDetail,
  updateScheduledMassSMSDetail
} from '../controllers/scheduledMassSMS.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const scheduledMassSMS = Router()

scheduledMassSMS.get('/scheduled-mass-sms', authenticated, getAllScheduledMassSMS)
scheduledMassSMS.get('/scheduled-mass-sms/:id', authenticated, getSpecificScheduledMassSMS)

scheduledMassSMS.put('/scheduled-mass-sms/:id', authenticated, updateScheduledMassSMSDetail)
scheduledMassSMS.put('/scheduled-mass-sms/cancel/:id', authenticated, cancelScheduledMassSMSDetail)

export default scheduledMassSMS
