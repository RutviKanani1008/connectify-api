import { Router } from 'express'
import {
  addMassSMSDetail,
  deleteMassSMSDetail,
  getMassSMSDetails,
  getSpecificMassSMSDetails,
  sendMassSMSById,
  sendMassSMSWithoutSave,
  updateMassSMSDetail
} from '../controllers/massSMS.controller'

import { authenticated } from '../middlewares/authenticated.middleware'

const massSMS = Router()

massSMS.get('/mass-sms', authenticated, getMassSMSDetails)
massSMS.get('/mass-sms/:id', authenticated, getSpecificMassSMSDetails)

massSMS.post('/mass-sms', authenticated, addMassSMSDetail)
massSMS.post('/send-mass-sms', authenticated, sendMassSMSWithoutSave)
massSMS.post('/send-mass-sms/:id', authenticated, sendMassSMSById)

massSMS.put('/mass-sms/:id', authenticated, updateMassSMSDetail)

massSMS.delete('/mass-sms/:id', authenticated, deleteMassSMSDetail)

export default massSMS
