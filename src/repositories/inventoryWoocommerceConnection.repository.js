import {InventoryWoocommerceConnection} from '../models/inventoryWoocommerceConnection';

export const findWooConnectionRepo = (params, projection = {}) => {
  return InventoryWoocommerceConnection.findOne(params, projection)
}

export const findWooConnectionsRepo = (params, projection = {}) => {
  return InventoryWoocommerceConnection.find(params, projection).sort({ createdAt: -1 })
}

export const createWooConnectionRepo = (data) => {
  return InventoryWoocommerceConnection.create(data)
}

export const updateWooConnectionRepo = (search, updateValue) => {
  return InventoryWoocommerceConnection.updateOne(search, updateValue)
}

export const deleteWooConnectionRepo = (params) => {
  return InventoryWoocommerceConnection.delete(params)
}
