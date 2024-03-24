import { Router } from 'express'
import { checkProductCriteriaIsExist, createProductCriteria, deleteProductCriteriaById, getProductCriteria, getProductCriteriaDetails, reOrderCriteria, updateProductCriteriaById } from '../controllers/inventoryProductCriteria.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const router = Router()

// post
router.post('/inventory/product-criteria', authenticated, createProductCriteria)
router.post('/inventory/product-criteria/reorder', reOrderCriteria)

// get
router.get('/inventory/product-criteria/is-exist', authenticated, checkProductCriteriaIsExist)
router.get('/inventory/product-criteria/all', authenticated, getProductCriteria)
router.get('/inventory/product-criteria/:id', authenticated, getProductCriteriaDetails)

// put
router.put('/inventory/product-criteria/:id', authenticated, updateProductCriteriaById)

// delete
router.delete('/inventory/product-criteria/:id', authenticated, deleteProductCriteriaById)

export default router
