import { Router } from 'express'
import {
  addProductDetail, getProductDetailsByBarcode, getProductDetailsByManufacturerBarcode, getProducts, getProductsByName, getSpecificProductHistory, getSpecificProductsDetails, updateProductDetail, validateImportProducts
} from '../controllers/inventoryProduct.controller'
import { authenticated } from '../middlewares/authenticated.middleware'
import { fileUploader } from '../middlewares/fileUploader'
import { deleteCurrentImportProducts, deleteImportProducts, getCurrentImportProducts, importFinalProducts, updateCurrentImportProducts } from '../controllers/importProduct.controller'

const router = Router()

// get
router.get('/inventory/product', authenticated, getProducts)
router.get('/inventory/product/history', authenticated, getSpecificProductHistory)
router.get('/inventory/product/search', authenticated, getProductsByName)
router.get('/inventory/product/:id', authenticated, getSpecificProductsDetails)
router.get('/inventory/product/barcode/:id', authenticated, getProductDetailsByBarcode)
router.get('/inventory/product/manufactureBarcode/:id', authenticated, getProductDetailsByManufacturerBarcode)

// post
router.post('/inventory/product', authenticated, addProductDetail)
router.post('/inventory/product/import-products', authenticated, fileUploader, validateImportProducts)
router.post('/inventory/product/current-import-products', authenticated, getCurrentImportProducts)
router.post('/inventory/product/final-import-products/:id', authenticated, importFinalProducts)

// put
router.put('/inventory/product/:id', authenticated, updateProductDetail)
router.put('/inventory/product/current-import-products/:id', authenticated, updateCurrentImportProducts)

// delete
// product.delete('/product/:id', authenticated, deleteProductDetail)

router.delete('/inventory/product/trash-import-products/:id', authenticated, deleteImportProducts)
router.delete('/inventory/product/current-import-products/:id', authenticated, deleteCurrentImportProducts)

export default router
