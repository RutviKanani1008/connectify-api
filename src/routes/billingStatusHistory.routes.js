import { Router } from 'express'
import { changeBillStatusHistory, getBillHistory } from '../controllers/billingStatusHistory.controller'

const changeBillHistoryStatus = Router()

// get
changeBillHistoryStatus.get('/bill-status-history', getBillHistory)

// post
changeBillHistoryStatus.post('/change-bill-status-history', changeBillStatusHistory)

export default changeBillHistoryStatus
