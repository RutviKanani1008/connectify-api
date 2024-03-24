import { Router } from 'express'
import {
  addInvoice,
  addInvoiceAsDraft,
  cloneInvoice,
  deleteInvoice,
  getAllInvoices,
  getNewInvoiceId,
  getSpecificInvoice,
  saveAndSendInvoice,
  sendInvoice,
  updateInvoice,
  updateInvoiceStatus,
  TestSendInvoice,
  sendTestInvoice,
  updateStripInvoiceStatus
} from '../controllers/invoice.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const invoice = Router()

// get
invoice.get('/invoice', authenticated, getAllInvoices)
invoice.get('/invoice/new-id', authenticated, getNewInvoiceId)
invoice.get('/invoice/:id', getSpecificInvoice)
invoice.get('/test-stripe-webhook', updateStripInvoiceStatus)

// post
invoice.post('/invoice', authenticated, addInvoice)
invoice.post('/invoice/send', authenticated, saveAndSendInvoice)
invoice.post('/invoice/send-test-invoice/:slug', authenticated, sendTestInvoice)
invoice.post('/invoice/send-invoice/:slug', authenticated, sendInvoice)
invoice.post('/invoice/draft', authenticated, addInvoiceAsDraft)
invoice.post('/invoice/clone/:id', authenticated, cloneInvoice)
invoice.post('/test-send-invoice', authenticated, TestSendInvoice)

// put
invoice.put('/invoice/:id', authenticated, updateInvoice)
invoice.put('/invoice/update-status/:id', authenticated, updateInvoiceStatus)

// delete
invoice.delete('/invoice/:id', authenticated, deleteInvoice)

export default invoice
