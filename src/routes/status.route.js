import { Router } from 'express'
import { addStatusDetail, deleteStatusDetail, getStatusDetails, updateStatusDetail } from '../controllers/status.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const status = Router()

status.get('/status', authenticated, getStatusDetails)

status.post('/status', authenticated, addStatusDetail)

status.put('/status/:id', authenticated, updateStatusDetail)

status.delete('/status/:id', authenticated, deleteStatusDetail)

export default status
