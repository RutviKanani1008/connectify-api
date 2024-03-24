import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  addCmsContentDetail,
  deleteCmsContentDetail,
  getCmsContents,
  updateCmsContentDetails
} from '../controllers/cmsContent.controller'

const cmsContent = Router()

cmsContent.get('/cms-content', authenticated, getCmsContents)

cmsContent.post('/cms-content', authenticated, addCmsContentDetail)

cmsContent.put('/cms-content/:id', authenticated, updateCmsContentDetails)

cmsContent.delete('/cms-content/:id', authenticated, deleteCmsContentDetail)

export default cmsContent
