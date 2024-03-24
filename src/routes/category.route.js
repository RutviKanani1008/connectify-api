import { Router } from 'express'
import {
  addCategoryDetail,
  deleteCategoryDetail,
  getCategoryDetails,
  updateCategoryDetail
} from '../controllers/category.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const category = Router()

category.get('/category', authenticated, getCategoryDetails)

category.post('/category', authenticated, addCategoryDetail)

category.put('/category/:id', authenticated, updateCategoryDetail)

category.delete('/category/:id', authenticated, deleteCategoryDetail)

export default category
