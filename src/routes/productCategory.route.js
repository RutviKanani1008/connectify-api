import { Router } from 'express'
import {
  createProductCategory,
  getProductCategories,
  deleteProductCategoryById,
  updateProductCategoryById,
  getProductCategory,
  checkProductCategoryIsExist
} from '../controllers/productCategory.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const router = Router()

// post
router.post('/product-category', authenticated, createProductCategory)

// get
router.get('/product-category/is-exist', authenticated, checkProductCategoryIsExist)
router.get('/product-category/all', authenticated, getProductCategories)
router.get('/product-category/:id', authenticated, getProductCategory)

// put
router.put('/product-category/:id', authenticated, updateProductCategoryById)

// delete
router.delete('/product-category/:id', authenticated, deleteProductCategoryById)

export default router
