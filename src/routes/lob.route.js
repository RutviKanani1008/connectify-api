import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import { sendDirectMailViaLob } from '../controllers/lob.controller'

const lob = Router()

lob.post('/send-direct-mail-via-lob/:id', authenticated, sendDirectMailViaLob)

export default lob
