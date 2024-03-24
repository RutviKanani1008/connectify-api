import { ProductCategory } from '../models/productCategory'

export const findProductCategoryRepo = (params, projection = {}) => {
  return ProductCategory.findOne(params, projection)
}

export const findProductCategoriesRepo = (params, projection = {}) => {
  return ProductCategory.find(params, projection).sort({ createdAt: -1 })
}

export const createProductCategoryRepo = (data) => {
  return ProductCategory.create(data)
}

export const updateProductCategoryRepo = (search, updateValue) => {
  return ProductCategory.updateOne(search, updateValue)
}

export const deleteProductCategoryRepo = (params) => {
  return ProductCategory.delete(params)
}
