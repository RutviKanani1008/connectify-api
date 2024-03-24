// ==================== Packages =======================
import { ObjectId } from 'mongodb'
// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {
  findOfflineOrderRepo,
  createOfflineOrderRepo,
  findAllOfflineOrder,
  updateOfflineOrder,
  findOfflineOrderWithAggregation,
  findOfflineOrderCount
} from '../repositories/inventoryOfflineOrder.repository'
import { getSelectParams } from '../helpers/generalHelper'
import { updateProductQuantity } from './inventoryProduct.controller'
import { parseData } from '../utils/utils'

export const createOfflineOrder = async (req, res) => {
  try {
    const totalOrders = await totalOfflineOrders(req?.headers?.authorization?.company)
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    req.body.createdBy = currentUser._id
    req.body.company = req?.headers?.authorization?.company
    req.body.orderNumber = `#${(totalOrders?.[0]?.count || 0) + 1}`

    const isExist = await findOfflineOrderRepo({
      orderNumber: req.body.orderNumber,
      company: req?.headers?.authorization?.company
    })

    if (isExist) {
      return generalResponse(res, null, { text: 'Order Already Exist' }, 'error')
    }
    if (req.body.orderDetails.orderStatus.value === 'completed') {
      const products = req.body.orderDetails.orderItems
       products.forEach(item => {
        item.quantity = item.quantity - item.purchaseQty
       })
       await updateProductQuantity(products);
    }

    const orderData = await createOfflineOrderRepo(req.body)
    return generalResponse(res, orderData, 'Order created successfully.', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateOfflineOrderDetails = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) {
      return generalResponse(res, false, { text: 'Order id is required.' }, 'error', false, 400)
    }
    if (req.body.orderDetails.orderStatus.value === 'completed') {
      const products = req.body.orderDetails.orderItems
       products.forEach(item => {
        item.quantity = item.quantity - item.purchaseQty
       })
      await updateProductQuantity(products)
    }
    await updateOfflineOrder({ _id: req.params.id }, req.body)
    return generalResponse(res, null, 'Order updated successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getOfflineOrders = async (req, res) => {
  try {
    const orders = await findAllOfflineOrder(
      { company: ObjectId(req?.headers?.authorization?.company) },
      getSelectParams(req)
    )
    return generalResponse(res, orders, '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getOfflineOrdersAggregation = async (req, res) => {
  try {
    const project = { ...getSelectParams(req) }
    let { orderStatus, companyId, limit = 5, page = 1, search = '', sort, startDate, endDate } = req.query
    sort = parseData(sort)
    const skip = Number(limit) * Number(page) - Number(limit)
    const $and = [{ company: ObjectId(companyId) }]
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      $and.push({ createdAt: { $gte: start, $lt: end } })
    }
    if (orderStatus) {
      const status = parseData(orderStatus)
      $and.push({ 'orderDetails.orderStatus.label': status.label })
    }
    if (search) {
      const reg = new RegExp(search, 'i')
      $and.push({
        $or: [
          { 'customerDetails.name': { $regex: reg } },
          { 'orderDetails.orderStatus.label': { $regex: reg } },
          { 'paymentDetails.paymentMethod.label': { $regex: reg } },
          { orderNumber: { $regex: reg } },
          { totalAmount: { $regex: reg } }
        ]
      })
    }
    const match = { ...($and.length ? { $and } : {}) }

    const totalOrders = await findOfflineOrderCount({
      match
    })

    const orders = await findOfflineOrderWithAggregation({ match, skip, limit: Number(limit), sort, project })
    return generalResponse(
      res,
      { results: orders, pagination: { total: totalOrders?.[0]?.count || 0 } },
      '',
      'success'
    )
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificOrderDetails = async (req, res) => {
  try {
    const orderDetails = await findOfflineOrderRepo({ _id: ObjectId(req.params.id) }, getSelectParams(req))
    return generalResponse(res, orderDetails, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

const totalOfflineOrders = async (companyId) => {
   const totalOrders = await findOfflineOrderCount({
      company: companyId
   })
  return totalOrders
}
