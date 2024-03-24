import {InventoryWooDefaultSettings} from '../models/InventoryWooDefaultSettings';

export const findWooDefaultSettingRepo = (params, projection = {}) => {
  return InventoryWooDefaultSettings.findOne(params, projection)
}

export const createWooDefaultSettingRepo = (data) => {
  return InventoryWooDefaultSettings.create(data)
}

export const updateWooDefaultSettingRepo = (search, updateValue) => {
  return InventoryWooDefaultSettings.updateOne(search, updateValue)
}

export const deleteWooDefaultSettingRepo = (params) => {
  return InventoryWooDefaultSettings.delete(params)
}
