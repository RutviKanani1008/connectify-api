import {InventoryWarehouseLocations} from '../models/inventoryWarehouseLocations';

export const findWarehouseLocationRepo = (params, projection = {}) => {
  return InventoryWarehouseLocations.findOne(params, projection)
}

export const findWarehouseLocationsRepo = (params, projection = {}) => {
  return InventoryWarehouseLocations.find(params, projection).sort({ createdAt: -1 })
}

export const createWarehouseLocationRepo = (data) => {
  return InventoryWarehouseLocations.create(data)
}

export const updateWarehouseLocationRepo = (search, updateValue) => {
  return InventoryWarehouseLocations.updateOne(search, updateValue)
}

export const deleteWarehouseLocationRepo = (params) => {
  return InventoryWarehouseLocations.delete(params)
}
