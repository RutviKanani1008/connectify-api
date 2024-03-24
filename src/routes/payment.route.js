import { Router } from 'express'
import {
  addPaymentMethod,
  deletePaymentMethods,
  getPaymentMethodsByContactId,
  makeDefaultPaymentMethod
} from '../controllers/payment.controller'

import { authenticated } from '../middlewares/authenticated.middleware'

const payment = Router()

// post
payment.post('/payment-method', authenticated, addPaymentMethod)

// put
payment.put('/payment-method/make-default', authenticated, makeDefaultPaymentMethod)

// get
payment.get('/payment-methods-by-contact-id/:id', authenticated, getPaymentMethodsByContactId)

// delete
payment.delete('/payment-methods/delete', authenticated, deletePaymentMethods)

export default payment
