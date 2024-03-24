import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  cloneEnvelope,
  deleteEnvelope,
  getAllEnvelopes,
  getEnvelope,
  saveEnvelope,
  updateEnvelope
} from '../controllers/envelope.controller'

const envelope = Router()

envelope.get('/envelope', authenticated, getAllEnvelopes)
envelope.get('/envelope/:id', authenticated, getEnvelope)

envelope.post('/envelope', authenticated, saveEnvelope)
envelope.post('/envelope-clone/:id', authenticated, cloneEnvelope)

envelope.delete('/envelope/:id', authenticated, deleteEnvelope)

envelope.put('/envelope/:id', authenticated, updateEnvelope)

export default envelope
