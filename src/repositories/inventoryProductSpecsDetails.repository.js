import {InventoryProductSpecsDetails} from '../models/inventoryProductSpecsDetails';

export const findProductSpecsRepo = (params, projection = {}) => {
  return InventoryProductSpecsDetails.findOne(params, projection)
}

export const findProductSpecsAllRepo = (params, projection = {}) => {
  return InventoryProductSpecsDetails.find(params, projection).sort({ createdAt: -1 })
}

export const createProductSpecRepo = (data) => {
  return InventoryProductSpecsDetails.create(data)
}

export const updateProductSpecRepo = (search, updateValue) => {

  return InventoryProductSpecsDetails.updateOne(search, updateValue)
}

export const deleteProductSpecRepo = (params) => {
  return InventoryProductSpecsDetails.delete(params)
}
