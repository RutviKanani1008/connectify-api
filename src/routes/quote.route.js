import { Router } from 'express'
import {
  addQuote,
  cloneQuote,
  deleteQuote,
  getAllQuotes,
  getNewQuoteId,
  getSpecificQuote,
  sendQuoteById,
  sendTestQuote,
  updateQuote,
  updateQuoteStatus
} from '../controllers/quote.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const quote = Router()

// get
quote.get('/quotes', authenticated, getAllQuotes)
quote.get('/quotes/new-id', authenticated, getNewQuoteId)
quote.get('/quotes/:id', getSpecificQuote)

// post
quote.post('/quotes', authenticated, addQuote)
quote.post('/quotes/send/:slug', sendQuoteById)
quote.post('/quotes/send-test-quote/:slug', sendTestQuote)
quote.post('/quotes/clone/:id', authenticated, cloneQuote)

// put
quote.put('/quotes/:id', authenticated, updateQuote)
quote.put('/quotes/update-status/:id/', updateQuoteStatus)

// delete
quote.delete('/quotes/:id', authenticated, deleteQuote)

export default quote
