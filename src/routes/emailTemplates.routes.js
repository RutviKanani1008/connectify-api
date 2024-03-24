import { Router } from 'express'
import {
  changeEmailTemplateFolderDetails,
  checkEmailTemplateAlreadyExist,
  cloneEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplates,
  listEmailTemplates,
  saveEmailTemplate,
  sendEmailTemplateMail
} from '../controllers/emailTemplates.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const emailTemplate = Router()

emailTemplate.get('/email-templates', authenticated, getEmailTemplates)
emailTemplate.get('/email-templates/list', authenticated, listEmailTemplates)

emailTemplate.post('/email-templates', authenticated, saveEmailTemplate)

emailTemplate.delete('/email-templates/:id', authenticated, deleteEmailTemplate)

emailTemplate.post('/send-test-email-template', authenticated, sendEmailTemplateMail)

emailTemplate.post('/clone-email-template/:id', authenticated, cloneEmailTemplate)

emailTemplate.post('/email-template-exist', authenticated, checkEmailTemplateAlreadyExist)

emailTemplate.post('/change-email-template-folder', authenticated, changeEmailTemplateFolderDetails)

export default emailTemplate
