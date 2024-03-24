import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  addIntegrationDetail,
  addSendgridConfig,
  addSmtpConfig,
  addTwilioConfig,
  getIntegrationDetails,
  updateIntegrationDetail,
  updateSendgridConfig,
  updateSmtpConfig,
  updateTwilioConfig
} from '../controllers/integration.controller'

const integration = Router()

integration.get('/integration', authenticated, getIntegrationDetails)

integration.post('/integration', authenticated, addIntegrationDetail)

integration.put('/integration/:id', authenticated, updateIntegrationDetail)

integration.post('/integration-smtp', authenticated, addSmtpConfig)

integration.put('/integration-smtp/:id', authenticated, updateSmtpConfig)

integration.post('/integration-sendgrid', authenticated, addSendgridConfig)

integration.put('/integration-sendgrid/:id', authenticated, updateSendgridConfig)

integration.post('/integration-twilio', authenticated, addTwilioConfig)

integration.put('/integration-twilio/:id', authenticated, updateTwilioConfig)

export default integration
