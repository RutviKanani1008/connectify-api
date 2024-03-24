import { Router } from 'express'
import {
  checkSmsTemplateAlreadyExist,
  cloneSmsTemplate,
  deleteSmsTemplate,
  getSmsTemplates,
  listSmsTemplates,
  saveSmsTemplate,
  sendSmsTemplate
} from '../controllers/smsTemplates.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const smsTemplate = Router()

smsTemplate.get('/sms-templates', authenticated, getSmsTemplates)
smsTemplate.get('/sms-templates/list', authenticated, listSmsTemplates)

smsTemplate.post('/sms-templates', authenticated, saveSmsTemplate)

smsTemplate.delete('/sms-templates/:id', authenticated, deleteSmsTemplate)

smsTemplate.post('/send-test-sms-template', authenticated, sendSmsTemplate)

smsTemplate.post('/clone-sms-template/:id', authenticated, cloneSmsTemplate)

smsTemplate.post('/sms-template-exist', authenticated, checkSmsTemplateAlreadyExist)

export default smsTemplate
