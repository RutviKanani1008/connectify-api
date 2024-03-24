import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  addMailProviderFolder,
  deleteMailProviderFolder,
  getMailProviderFolder
} from '../controllers/mailProviderFolder.controller'

const mailProviderFolder = Router()

mailProviderFolder.post('/mail-provider-folder', authenticated, addMailProviderFolder)
mailProviderFolder.get('/mail-provider-folder', authenticated, getMailProviderFolder)
mailProviderFolder.delete('/mail-provider-folder', authenticated, deleteMailProviderFolder)

export default mailProviderFolder
