import { InventoryProductCriteria } from '../models/inventoryProductCriteria'

export const findProductCriteriaRepo = (params, projection = {}) => {
  return InventoryProductCriteria.findOne(params, projection)
}

export const findProductCriteriaAllRepo = (params, projection = {}) => {
  return InventoryProductCriteria.find(params, projection).sort({ createdAt: -1 })
}

export const createProductCriteriaRepo = (data) => {
  return InventoryProductCriteria.create(data)
}

export const criteriaBulkWrite = (orderObjArray) => {
  return InventoryProductCriteria.bulkWrite(orderObjArray)
}

export const updateProductCriteriaRepo = (search, updateValue) => {
  return InventoryProductCriteria.updateOne(search, updateValue)
}

export const deleteProductCriteriaRepo = (params) => {
  return InventoryProductCriteria.delete(params)
}
