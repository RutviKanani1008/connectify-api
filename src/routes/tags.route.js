import { Router } from 'express'
import { addTagDetail, deleteTagDetail, getTagsDetails, updateTagDetail, updateTagsFolder } from '../controllers/tags.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const tags = Router()

tags.get('/tags', authenticated, getTagsDetails)

tags.post('/tags', authenticated, addTagDetail)

tags.put('/tags/:id', authenticated, updateTagDetail)

tags.delete('/tags/:id', authenticated, deleteTagDetail)

tags.post('/tags-folder', authenticated, updateTagsFolder)

export default tags
