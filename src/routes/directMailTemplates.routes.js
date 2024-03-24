import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  cloneDirectMailTemplate,
  deleteDirectMailTemplate,
  getAllDirectMailTemplatedDetails,
  getAllDirectMailTemplates,
  getDirectMailTemplate,
  saveDirectMailTemplate,
  updateDirectMailTemplate,
  updateFolderOrderDirectMailTemplate
} from '../controllers/directMailTemplates.controller'

const directMailTemplate = Router()

directMailTemplate.get('/direct-mail-template', authenticated, getAllDirectMailTemplates)
directMailTemplate.get('/direct-mail-template/all', authenticated, getAllDirectMailTemplatedDetails)
directMailTemplate.get('/direct-mail-template/:id', authenticated, getDirectMailTemplate)

directMailTemplate.post('/direct-mail-template', authenticated, saveDirectMailTemplate)
directMailTemplate.post('/direct-mail-template-clone/:id', authenticated, cloneDirectMailTemplate)

directMailTemplate.delete('/direct-mail-template/:id', authenticated, deleteDirectMailTemplate)

directMailTemplate.put('/direct-mail-template/update-folder-order', authenticated, updateFolderOrderDirectMailTemplate)
directMailTemplate.put('/direct-mail-template/:id', authenticated, updateDirectMailTemplate)

export default directMailTemplate
