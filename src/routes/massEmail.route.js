import { Router } from 'express'
import {
  addMassEmailDetail,
  deleteMassEmailDetail,
  getMassEmailDetails,
  getSpecificMassEmailDetails,
  sendMassEmailWithoutSave,
  sendMassEmailById,
  updateMassEmailDetail,
  getSendGridMatrix,
  getSpecifcCategoryGridMatrix,
  sendMassEmailFromContactList,
  getSpecificMassEmailContacts
} from '../controllers/massEmail.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const massEmail = Router()

massEmail.get('/mass-email', authenticated, getMassEmailDetails)
massEmail.get('/mass-email/:id', authenticated, getSpecificMassEmailDetails)
massEmail.get('/mass-email/:id/contacts', authenticated, getSpecificMassEmailContacts)
massEmail.get('/send-grid-matrix', authenticated, getSendGridMatrix)
massEmail.get('/category-sendgrid-matrix/:id', authenticated, getSpecifcCategoryGridMatrix)

massEmail.post('/mass-email', authenticated, addMassEmailDetail)
massEmail.post('/send-mass-email', authenticated, sendMassEmailWithoutSave)
massEmail.post('/send-mass-email-from-contact-list', authenticated, sendMassEmailFromContactList)
massEmail.post('/send-mass-email/:id', authenticated, sendMassEmailById)

massEmail.put('/mass-email/:id', authenticated, updateMassEmailDetail)

massEmail.delete('/mass-email/:id', authenticated, deleteMassEmailDetail)

export default massEmail
