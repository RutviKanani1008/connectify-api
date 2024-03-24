import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import { deleteCurrentImportContacts, deleteImportContacts, getCurrentImportContacts, importFinalContacts, updateCurrentImportContacts } from '../controllers/importContacts.controller'

const importContacts = Router()

importContacts.post('/final-import-contacts/:id', authenticated, importFinalContacts)

importContacts.post('/current-import-contacts', authenticated, getCurrentImportContacts)

importContacts.delete('/current-import-contacts/:id', authenticated, deleteCurrentImportContacts)

importContacts.put('/current-import-contacts/:id', authenticated, updateCurrentImportContacts)

importContacts.delete('/trash-import-contacts/:id', authenticated, deleteImportContacts)

export default importContacts
