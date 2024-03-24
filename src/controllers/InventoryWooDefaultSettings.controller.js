// ==================== Packages =======================
import axios from 'axios'
import { getSelectParams } from '../helpers/generalHelper'

// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {

  createWooDefaultSettingRepo,
  findWooDefaultSettingRepo
} from '../repositories/inventoryWooDefaultSettings.repository'
import { getProductSettings } from './wooCommerceController'

export const saveWooDefaultSettings = async (data,companyId) => {
  try {  
    const store = await createWooDefaultSettingRepo({
      ...data,
      company: companyId
    })
    return store 
  } catch (error) {
    console.log(error)
    return  error
  }
}

export const getWooDefaultSettings = async (req, res) => {
  try {

    let settingData = await findWooDefaultSettingRepo({ company: req?.headers?.authorization?.company }, getSelectParams(req))
    if (!settingData) {
      const settings = await getProductSettings(req?.headers?.authorization?.company);
      if (settings) {
        const dimetionDefaultValue = settings.find(o => o.id === 'woocommerce_dimension_unit');
        const weightDefaultValue = settings.find(o => o.id === 'woocommerce_weight_unit');
        const defaultObj = { 
          dimensionUnit: dimetionDefaultValue.value,
          weightUnit: weightDefaultValue.value
        }
      settingData = await saveWooDefaultSettings(defaultObj, req?.headers?.authorization?.company);
      }

    }
    return generalResponse(res, settingData, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
