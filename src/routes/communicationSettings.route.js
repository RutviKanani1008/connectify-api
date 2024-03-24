import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  createOrUpdateCommunicationSetting,
  getCommunicationSetting
} from '../controllers/communicationSettings.controller'

const communicationSettings = Router()

communicationSettings.get('/communication-setting', authenticated, getCommunicationSetting)
communicationSettings.post('/communication-setting', authenticated, createOrUpdateCommunicationSetting)

export default communicationSettings
