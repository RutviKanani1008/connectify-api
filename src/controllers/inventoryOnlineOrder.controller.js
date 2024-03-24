// ==================== Packages =======================
import { ObjectId } from 'mongodb'
// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {
  findAllOnlineOrder,
  findOnlineOrderCount,
  findOnlineOrderWithAggregation,
  findOnlineOrderRepo,
  createOnlineOrderRepo,
  updateOnlineOrder,
  deleteOnlineOrder
} from '../repositories/inventoryOnlineOrder.repository'
import { getSelectParams } from '../helpers/generalHelper'
import { parseData } from '../utils/utils'
import { findWooConnectionsRepo } from '../repositories/inventoryWoocommerceConnection.repository'
import { findAllUser, findUser } from '../repositories/users.repository'
import { updateWooOrder } from './wooCommerceController'
import { findProduct } from '../repositories/inventoryProduct.repository'
import { sendMail } from '../services/send-grid'

export const getOnlineOrders = async (req, res) => {
  try {
    const orders = await findAllOnlineOrder(
      { company: ObjectId(req?.headers?.authorization?.company) },
      getSelectParams(req)
    )
    return generalResponse(res, orders, '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const wooOrderWebhookDetail = async (req, res) => {
  try {
    const type = req.headers['x-wc-webhook-event']
    if (type === 'updated' || type === 'created') {
      const storeDetails = await findWooConnectionsRepo({ url: req?.body?.site_url })
      storeDetails.forEach(async (store) => {
      const adminUser = await findUser({ company: store.company, role: 'admin' })
      const orderData = { ...req.body }
      orderData.company = store.company
      orderData.createdBy = adminUser?._id || null
      orderData.customerDetails = []
      orderData.customerDetails.push({
        name: orderData.c_displayname,
        email: orderData.c_email ? orderData.c_email : ''
      })
      orderData.wooID = orderData?.id || null
      const isOrderExists = await findOnlineOrderRepo({
        wooID: orderData.wooID,
        company: store.company
      })
      if (isOrderExists) {
        if (orderData.status && orderData.status === 'pending') {
          const data = await Promise.all(req.body.line_items.map(async (item) => {
            const product = await findProduct({ wooID: item.product_id, company: store.company })
            if (product) {
              return { ...item, productLocations: product.productLocations, pickerAction: 'true', pickerComment: '', shipperAction: 'true', shipperComment: '' }
            }
          }))
          orderData.orderDetails = data
        }
        await updateOnlineOrder({ wooID: orderData.wooID, company: ObjectId(store.company) }, { ...orderData })
        if (orderData.status && orderData.status === 'on-hold') {
        const productHTMLTemplate = `<h2 style="margin-bottom: 24px;text-align:center;color: #FA8072;">Redlightdealz</h2>
          <h4>Order #${orderData.number} on hold please click on below link</h4> 
          <a style="display: block;
            font-size: 14px;
            line-height: 100%;
            margin-bottom: 24px;
            color: #a3db59;
            text-decoration: none;" href=${process.env.HOST_NAME}/admin/online-order-details/${isOrderExists._id}>View Order</a>`

      const users = await findAllUser({ company: req.body.company, inventoryRole: 'adminUser' })
      if (users) {
       for (const user of users) {
        await sendMail({ receiver: user.email, subject: 'Order On hold !', htmlBody: productHTMLTemplate })
      }
     }
        }
        if (orderData.status && orderData.status === 'ready-for-ship') {
        const productHTMLTemplate = `<h2 style="margin-bottom: 24px;text-align:center;color: #FA8072;">Redlightdealz</h2>
          <h4>Order #${orderData.number} added please click on below link</h4> 
          <a style="display: block;
            font-size: 14px;
            line-height: 100%;
            margin-bottom: 24px;
            color: #a3db59;
            text-decoration: none;" href=${process.env.HOST_NAME}/member/online-order-details/${isOrderExists._id}>View Order</a>`

      const users = await findAllUser({ company: req.body.company, inventoryRole: 'shippingUser' })
      if (users) {
       for (const user of users) {
        await sendMail({ receiver: user.email, subject: 'Order Added For Shipping!', htmlBody: productHTMLTemplate })
      }
     }
        }
      } else {
          const data = await Promise.all(req.body.line_items.map(async (item) => {
          const product = await findProduct({ wooID: item.product_id, company: store.company })
            if (product) {
              return { ...item, productLocations: product.productLocations, pickerAction: 'true', pickerComment: '', shipperAction: 'true', shipperComment: '' }
            }
          }))
        orderData.orderDetails = data
        console.log(orderData)
        const orderCreated = await createOnlineOrderRepo({ ...orderData })
        console.log(orderCreated)
        const productHTMLTemplate = `<h2 style="margin-bottom: 24px;text-align:center;color: #FA8072;">Redlightdealz</h2>
          <h4>New Order #${orderCreated.number} has been added please click on below link</h4> 
          <a style="display: block;
            font-size: 14px;
            line-height: 100%;
            margin-bottom: 24px;
            color: #a3db59;
            text-decoration: none;" href=${process.env.HOST_NAME}/member/online-order-details/${orderCreated._id}>View Order</a>`

      const users = await findAllUser({ company: store.company, inventoryRole: 'pickerUser' })
      if (users) {
       for (const user of users) {
        await sendMail({ receiver: user.email, subject: 'New Order Added !', htmlBody: productHTMLTemplate })
      }
     }
      }
      })
    }
    if (type === 'deleted') {
      const storeDetails = await findWooConnectionsRepo({ url: req?.body?.site_url })
      storeDetails.forEach(async (store) => {
        await deleteOnlineOrder({ wooID: req?.body?.id, company: store.company })
      })
    }
    return generalResponse(res, 200)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateOnlineOrderDetails = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) {
      return generalResponse(res, false, { text: 'Order id is required.' }, 'error', false, 400)
    }
    if (req.body.wooID) {
      const orderObj = {
        id: req.body.wooID,
        status: req.body.status
      }
       const wooData = await updateWooOrder(req.body.company, orderObj, req.body.wooID)
        if (wooData && wooData.id) {
          req.body.wooID = wooData.id
        } else {
          return generalResponse(res, wooData, { text: wooData.message }, 'error', false, 400)
        }
    }
    if (req.body.status && req.body.status === 'on-hold') {
        const productHTMLTemplate = `<h2 style="margin-bottom: 24px;text-align:center;color: #FA8072;">Redlightdealz</h2>
          <h4>Order #${req.body.number} on hold please click on below link</h4> 
          <a style="display: block;
            font-size: 14px;
            line-height: 100%;
            margin-bottom: 24px;
            color: #a3db59;
            text-decoration: none;" href=${process.env.HOST_NAME}/admin/online-order-details/${req.body._id}>View Order</a>`

      const users = await findAllUser({ company: req.body.company, inventoryRole: 'adminUser' })
      if (users) {
       for (const user of users) {
        await sendMail({ receiver: user.email, subject: 'Order On hold !', htmlBody: productHTMLTemplate })
      }
     }
    }
    if (req.body.status && req.body.status === 'ready-for-ship') {
        const productHTMLTemplate = `<h2 style="margin-bottom: 24px;text-align:center;color: #FA8072;">Redlightdealz</h2>
          <h4>Order #${req.body.number} added please click on below link</h4> 
          <a style="display: block;
            font-size: 14px;
            line-height: 100%;
            margin-bottom: 24px;
            color: #a3db59;
            text-decoration: none;" href=${process.env.HOST_NAME}/member/online-order-details/${req.body._id}>View Order</a>`

      const users = await findAllUser({ company: req.body.company, inventoryRole: 'shippingUser' })
      if (users) {
       for (const user of users) {
        await sendMail({ receiver: user.email, subject: 'Order Added For Shipping!', htmlBody: productHTMLTemplate })
      }
     }
    }
    await updateOnlineOrder({ _id: req.body._id }, { ...req.body })
    return generalResponse(res, null, 'Order updated successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const getOnlineOrdersAggregation = async (req, res) => {
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
      $and.push({ status: status.value })
    }
    if (search) {
      const reg = new RegExp(search, 'i')
      $and.push({
        $or: [
          { number: { $regex: reg } },
          { total: { $regex: reg } }
        ]
      })
    }
    const match = { ...($and.length ? { $and } : {}) }

    const totalOrders = await findOnlineOrderCount({
      match
    })

    const orders = await findOnlineOrderWithAggregation({ match, skip, limit: Number(limit), sort, project })
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
    const orderDetails = await findOnlineOrderRepo({ _id: ObjectId(req.params.id) }, getSelectParams(req))
    return generalResponse(res, orderDetails, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
