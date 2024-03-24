import { Router } from 'express'

import { authenticated } from '../middlewares/authenticated.middleware'
import {
  createProductSpecs,
  checkProductSpecIsExist,
  getProductSpecs,
  updateProductSpecsById,
  deleteProductSpecById,
  saveDefaultValues
} from '../controllers/inventoryProductSpecsDetails.controller'

const router = Router()

// post
router.post('/inventory/product-spec', authenticated, createProductSpecs)
router.post('/inventory/product-spec/saveDefault', authenticated, saveDefaultValues);


// get
router.get('/inventory/product-spec/is-exist', authenticated, checkProductSpecIsExist)
router.get('/inventory/product-spec/all', authenticated, getProductSpecs)

// put
router.put('/inventory/product-spec/:id', authenticated, updateProductSpecsById)

// delete
router.delete('/inventory/product-spec/:id', authenticated, deleteProductSpecById)

export default router
