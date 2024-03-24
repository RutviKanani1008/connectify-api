import { InventoryOfflineOrder } from '../models/inventoryOfflineOrder'
import { ObjectId } from 'mongodb'
import { parseData } from '../utils/utils'

export const findOfflineOrderRepo = (params, projection = {}) => {
  return InventoryOfflineOrder.findOne(params, projection)
}

export const findAllOfflineOrder = (params, projection = {}) => {
  return InventoryOfflineOrder.find(params, projection).sort({ createdAt: -1 })
}

export const createOfflineOrderRepo = (data) => {
  return InventoryOfflineOrder.create(data)
}

export const updateOfflineOrder = (search, updateValue) => {
  return InventoryOfflineOrder.updateOne(search, updateValue)
}

export const deleteOfflineOrder = (params) => {
  return InventoryOfflineOrder.delete(params)
}
export const findOfflineOrderCount = ({ match }) => {
  return InventoryOfflineOrder.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findOfflineOrderWithAggregation = ({ match, skip, limit, sort, project }) => {
  let $sort = {}
  if (sort && Object.keys(sort).length) {
    $sort = sort
  } else {
    $sort = { createdAt: -1 }
  }

  const $project = {
    ...(project && Object.keys(project).length
      ? { ...project }
      : {
          _id: 1
        })
  }
  return InventoryOfflineOrder.aggregate([
    {
      $match: { ...match }
    },
    {
      $project: { createdAt: -1, ...$project }
    },
    {
      $sort
    },
    { $skip: skip },
    { $limit: limit }
  ])
}

export const getFilterOrdersQuery = ({ filters, currentUser }) => {
  let { orderStatus, search = '', sort, startDate, endDate } = filters
    sort = parseData(sort)
    const $and = []
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
   if (!sort) sort = { createdAt: -1 }
  return { query: { ...($and.length ? { $and } : {}) }, sort }
}
