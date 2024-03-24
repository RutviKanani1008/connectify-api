import { Router } from 'express'
import {
  addProductDetail,
  deleteProductDetail,
  getProductsDetails,
  getSpecificProductsDetails,
  updateProductDetail
} from '../controllers/product.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const product = Router()

// get
product.get('/product', authenticated, getProductsDetails)
product.get('/product/:id', authenticated, getSpecificProductsDetails)

// post
product.post('/product', authenticated, addProductDetail)

// put
product.put('/product/:id', authenticated, updateProductDetail)

// delete
product.delete('/product/:id', authenticated, deleteProductDetail)

export default product
