import {InventoryProductCategory} from '../models/inventoryProductCategory';

export const findProductCategoryRepo = (params, projection = {}) => {
  return InventoryProductCategory.findOne(params, projection)
}

export const findProductCategoriesRepo = (params, projection = {}) => {
  return InventoryProductCategory.find(params, projection).sort({ createdAt: -1 })
}

export const createProductCategoryRepo = (data) => {
  return InventoryProductCategory.create(data)
}

export const updateProductCategoryRepo = (search, updateValue) => {
  return InventoryProductCategory.updateOne(search, updateValue)
}

export const deleteProductCategoryRepo = (params) => {
  return InventoryProductCategory.delete(params)
}
