import { Router } from 'express'
import {
  createDocument,
  deleteDocument,
  deleteDocumentsFolder,
  documentFileUpload,
  getDocumentDetail,
  getDocuments,
  updateDocument,
  updateDocumentOrder,
  updateDocumentsFolder
} from '../controllers/document.controller'
import { authenticated } from '../middlewares/authenticated.middleware'
import { s3BucketFileUploader } from '../middlewares/fileUploader'
const document = Router()

document.post('/document/document-file-upload', s3BucketFileUploader, documentFileUpload)
document.get('/documents', authenticated, getDocuments)
document.get('/document/:id', authenticated, getDocumentDetail)
document.post('/document', authenticated, createDocument)
document.post('/documents-folder', authenticated, updateDocumentsFolder)
document.delete('/documents-folder/:folderId', authenticated, deleteDocumentsFolder)
document.put('/document/:id', authenticated, updateDocument)
document.put('/documents/order', authenticated, updateDocumentOrder)
document.delete('/document/:id', authenticated, deleteDocument)

export default document
