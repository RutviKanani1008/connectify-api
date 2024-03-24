// ==================== Packages =======================
import axios from 'axios'
import { getSelectParams } from '../helpers/generalHelper'

// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {
  createWooConnectionRepo,
  findWooConnectionRepo,
  updateWooConnectionRepo
} from '../repositories/inventoryWoocommerceConnection.repository'

export const saveWooStore = async (req, res) => {
  try {
      const isExist = await findWooConnectionRepo({
        company: req?.headers?.authorization?.company
      })
    if (isExist) {
      await updateWooConnectionRepo({ _id: req.body._id }, { ...req.body })
      return generalResponse(res, null, ' Saved successfully.', 'success', true)
    } else {
      const url = `${req.body.url}wp-json/api/v1/verifytoken?siteUrl=${req.body.url}&consumerKey=${req.body.consumerKey}&consumerSecret=${req.body.consumerSecret}`
      const verifyData = await axios.post(url).catch((e) => {
        return e
      })
      if (verifyData && verifyData.data && verifyData.status === 200) {
        const store = await createWooConnectionRepo({
          ...req.body,
          company: req?.headers?.authorization?.company
        })
        return generalResponse(res, store, 'Store Saved successfully.', 'success', true)
      }
      else {
        return generalResponse(res, verifyData, 'WooCommerce Connection error', 'error', false, 400)
      }
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getWooStore = async (req, res) => {
  try {
    const store = await findWooConnectionRepo({ company: req?.headers?.authorization?.company }, getSelectParams(req))
    return generalResponse(res, store, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
