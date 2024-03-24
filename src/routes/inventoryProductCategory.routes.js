import { Router } from 'express'
import {
  createProductCategory,
  getProductCategories,
  deleteProductCategoryById,
  updateProductCategoryById,
  getProductCategory,
  checkProductCategoryIsExist
} from '../controllers/inventoryProductCategoryController'
import { authenticated } from '../middlewares/authenticated.middleware'

const router = Router()

// post
router.post('/inventory/product-category', authenticated, createProductCategory)

// get
router.get('/inventory/product-category/is-exist', authenticated, checkProductCategoryIsExist)
router.get('/inventory/product-category/all', authenticated, getProductCategories)
router.get('/inventory/product-category/:id', authenticated, getProductCategory)

// put
router.put('/inventory/product-category/:id', authenticated, updateProductCategoryById)

// delete
router.delete('/inventory/product-category/:id', authenticated, deleteProductCategoryById)

export default router
