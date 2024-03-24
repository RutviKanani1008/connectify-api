import { Router } from 'express'
import {
  checkChecklistTemplateAlreadyExist,
  cloneChecklistTemplate,
  copyChecklistTemplateToCompany,
  copyChecklistTemplateToContacts,
  deleteChecklistTemplate,
  getChecklistTemplates,
  getExportChecklistTemplates,
  getSpecificChecklistDetail,
  saveChecklistTemplate,
  updateChecklistFolder,
  updateChecklistOrder
} from '../controllers/checklistTemplates.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const checklistTemplate = Router()

const path = '/checklist-templates'

checklistTemplate
  .get(`${path}`, authenticated, getChecklistTemplates)
  .get(`${path}-export`, authenticated, getExportChecklistTemplates)
  .post(`${path}`, authenticated, saveChecklistTemplate)

checklistTemplate.get(`${path}/exist`, authenticated, checkChecklistTemplateAlreadyExist)

checklistTemplate.get(`${path}/:id`, getSpecificChecklistDetail)

checklistTemplate.delete(`${path}/:id`, authenticated, deleteChecklistTemplate)

checklistTemplate.post(`${path}/clone/:id`, authenticated, cloneChecklistTemplate)

checklistTemplate.post(`${path}/copy-to-contacts/:id`, authenticated, copyChecklistTemplateToContacts)

checklistTemplate.post(`${path}/copy-to-company/:id`, authenticated, copyChecklistTemplateToCompany)

checklistTemplate.post('/checklist-folder', authenticated, updateChecklistFolder)

checklistTemplate.post('/checklist/order', authenticated, updateChecklistOrder)

export default checklistTemplate
