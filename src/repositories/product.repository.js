import { Products } from '../models/product'

const findProduct = (params, projection = {}, populate) => {
  return Products.findOne(params, projection).sort({ createdAt: -1 }).populate(populate)
}

const findAllProduct = (params, projection = {}, populate) => {
  return Products.find(params, projection).sort({ createdAt: -1 }).populate(populate)
}

const createProduct = (data) => {
  return Products.create(data)
}

const updateProduct = (search, updateValue) => {
  return Products.updateOne(search, updateValue)
}

const deleteProduct = (product) => {
  return Products.delete(product)
}

export { createProduct, findProduct, findAllProduct, updateProduct, deleteProduct }
