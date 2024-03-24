import { Router } from 'express'
import {
  createFolderDetail,
  deleteFolderDetail,
  folderReOrder,
  getFolderDetails,
  updateFolderDetail
} from '../controllers/folder.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const folders = Router()

folders.get('/folder', authenticated, getFolderDetails)

folders.post('/folder', authenticated, createFolderDetail)

folders.post('/folders-reorder', authenticated, folderReOrder)

folders.put('/folder/:id', authenticated, updateFolderDetail)

folders.delete('/folder/:id', authenticated, deleteFolderDetail)

export default folders
