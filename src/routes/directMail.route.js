import { Router } from 'express'

import { authenticated } from '../middlewares/authenticated.middleware'
import {
  addDirectMailDetail,
  deleteDirectMailDetail,
  getAllDirectMailDetails,
  getSpecificDirectMailContacts,
  getSpecificDirectMailDetails,
  updateDirectMailDetail
} from '../controllers/directMail.controller'

const directMail = Router()

directMail.get('/direct-mail', authenticated, getAllDirectMailDetails)

directMail.get('/direct-mail/:id', authenticated, getSpecificDirectMailDetails)

directMail.get('/direct-mail/:id/contacts', authenticated, getSpecificDirectMailContacts)

directMail.post('/direct-mail', authenticated, addDirectMailDetail)

directMail.put('/direct-mail/:id', authenticated, updateDirectMailDetail)

directMail.delete('/direct-mail/:id', authenticated, deleteDirectMailDetail)

export default directMail
