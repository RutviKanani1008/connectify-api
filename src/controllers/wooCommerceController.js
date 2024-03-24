import pkg from '@woocommerce/woocommerce-rest-api'
import { findWooConnectionRepo } from '../repositories/inventoryWoocommerceConnection.repository'
import generalResponse from '../helpers/generalResponse.helper'

const WooCommerceRestApi = pkg.default

export const getWooUrl = async (companyId) => {
  try {
    const store = await findWooConnectionRepo({ company: companyId })
    if (store) {
      const api = new WooCommerceRestApi({
        url: store.url,
        consumerKey: store.consumerKey,
        consumerSecret: store.consumerSecret,
        queryStringAuth: true
      })
      return api
    }
  } catch (error) {
    return error
  }
}
export const getProductSettings = async (companyId) => {
  try {
    const api = await getWooUrl(companyId)
    const resData = await api
      .get(`settings/products/`)
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        return error.response.data
      })
    return resData
  } catch (error) {
    console.log(error)
    return generalResponse('', error, '', 'error', false, 400)
  }
}
export const createWooProductCategories = async (companyId, name) => {
  try {
    const postObj = {
      name: name
    }
    const api = await getWooUrl(companyId)
    const resData = await api
      .post('products/categories', postObj)
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        return error.response.data
      })
    return resData
  } catch (error) {
    return generalResponse('', error, '', 'error', false, 400)
  }
}
export const updateWooProductCategories = async (companyId, name, wooId) => {
  try {
    const postObj = {
      name: name
    }
    const api = await getWooUrl(companyId)
    const resData = await api
      .put(`products/categories/${wooId}`, postObj)
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        console.log(error)
        return error.response.data
      })
    return resData
  } catch (error) {
    console.log(error)
    return generalResponse('', error, '', 'error', false, 400)
  }
}
export const deleteWooProductCategories = async (companyId, wooId) => {
  try {
    const api = await getWooUrl(companyId)
    const resData = await api
      .delete(`products/categories/${wooId}`, { force: true })
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        return error
      })
    return resData
  } catch (error) {
    console.log(error)
    return generalResponse('', error, '', 'error', false, 400)
  }
}
export const createWooProduct = async (companyId, productObj) => {
  try {
    const api = await getWooUrl(companyId)
    const resData = await api
      .post('products', productObj)
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        console.log(error)
        return error.response.data
      })
    return resData
  } catch (error) {
    console.log(error)
    return generalResponse('', error, '', 'error', false, 400)
  }
}

export const updateWooProduct = async (companyId, productObj, wooId) => {
  try {
    const api = await getWooUrl(companyId)
    const resData = await api
      .put(`products/${wooId}`, productObj)
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        return error.response.data
      })
    return resData
  } catch (error) {
    console.log(error)
    return generalResponse('', error, '', 'error', false, 400)
  }
}
export const deleteWooProduct = async (companyId, wooID) => {
  try {
    const api = await getWooUrl(companyId)
    const resData = await api
      .delete(`products/${wooID}`, { force: true })
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        return error
      })
    return resData
  } catch (error) {
    console.log(error)
    return generalResponse('', error, '', 'error', false, 400)
  }
}

export const updateWooOrder = async (companyId, orderObj, wooId) => {
  try {
    const api = await getWooUrl(companyId)
    const resData = await api
      .put(`orders/${wooId}`, orderObj)
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        return error.response.data
      })
    return resData
  } catch (error) {
    console.log(error)
    return generalResponse('', error, '', 'error', false, 400)
  }
}
