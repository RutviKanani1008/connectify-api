import { Router } from 'express'
import {
  cancelScheduledContactMassEmailDetail,
  createNewContactEmail,
  getSendContactEmail
} from '../controllers/contactEmailHistory.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const contactEmail = Router()

contactEmail.get('/contact-email', authenticated, getSendContactEmail)

// customer.get('/customer/:id', authenticated, getSpecificCustomersDetails)

contactEmail.post('/contact-email', authenticated, createNewContactEmail)

// customer.put('/customer/:id', authenticated, updateCustomerDetail)

contactEmail.post('/schedule-contact-mass-email', authenticated, cancelScheduledContactMassEmailDetail)

export default contactEmail
