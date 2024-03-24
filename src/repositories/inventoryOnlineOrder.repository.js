import { InventoryOnlineOrder } from '../models/inventoryOnlineOrder'
import { parseData } from '../utils/utils'

export const findOnlineOrderRepo = (params, projection = {}) => {
  return InventoryOnlineOrder.findOne(params, projection)
}

export const findAllOnlineOrder = (params, projection = {}) => {
  return InventoryOnlineOrder.find(params, projection).sort({ createdAt: -1 })
}

export const createOnlineOrderRepo = (data) => {
  return InventoryOnlineOrder.create(data)
}

export const updateOnlineOrder = (search, updateValue) => {
  return InventoryOnlineOrder.updateOne(search, updateValue)
}

export const deleteOnlineOrder = (params) => {
  return InventoryOnlineOrder.delete(params)
}
export const findOnlineOrderCount = ({ match }) => {
  return InventoryOnlineOrder.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findOnlineOrderWithAggregation = ({ match, skip, limit, sort, project }) => {
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
  return InventoryOnlineOrder.aggregate([
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
  let { search = '', sort, startDate, endDate } = filters
    sort = parseData(sort)
    const $and = []
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      $and.push({ createdAt: { $gte: start, $lt: end } })
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
   if (!sort) sort = { createdAt: -1 }
  return { query: { ...($and.length ? { $and } : {}) }, sort }
}
