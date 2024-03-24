import { InventoryProducts } from '../models/inventoryProduct'
import { parseData } from '../utils/utils'
import { ObjectId } from 'mongodb'

const findProduct = (params, projection = {}, populate) => {
  return InventoryProducts.findOne(params, projection).slice('history', [0, 1]).sort({ createdAt: -1 }).populate(populate)
}
const findProductHistory = (params, projection = {}, populate, skip, limit) => {
  return InventoryProducts.findOne(params, projection).slice('history', [skip, limit]).sort({ createdAt: -1 }).populate(populate)
}

const findAllProduct = (params, projection = {}, populate) => {
  return InventoryProducts.find(params, projection).sort({ createdAt: -1 }).populate(populate)
}

const updateMultipleProducts = (productArrayObj) => {
  return InventoryProducts.bulkWrite(productArrayObj)
}

const createMultipleProducts = (productArrayObj) => {
  return InventoryProducts.insertMany(productArrayObj)
}

const createProduct = (data) => {
  return InventoryProducts.create(data)
}

const updateProduct = (search, updateValue) => {
  return InventoryProducts.updateOne(search, updateValue)
}

const deleteProduct = (product) => {
  return InventoryProducts.delete(product)
}

export const getFilterProductQuery = ({ filters, currentUser }) => {
  let { sort, search } = filters
  sort = parseData(sort)
  const $and = [{ company: ObjectId(currentUser.company) }]
  if (search) {
    const reg = new RegExp(search, 'i')
    $and.push({
      $or: [{ name: { $regex: reg } }, { body: { $regex: reg } }]
    })
  }
  if (!sort) sort = { createdAt: -1 }
  return { query: { ...($and.length ? { $and } : {}) }, sort }
}
const findProductWithAggregationCount = ({ match }) => {
  return InventoryProducts.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

const findProductWithAggregation = ({ match, skip, limit, sort, project }) => {
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
  return InventoryProducts.aggregate([
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
    { $limit: limit },
    {
      $lookup: {
        from: 'inventoryproductcategories',
        localField: 'category',
        foreignField: '_id',
        pipeline: [
          {
            $project: { _id: 1, name: 1 }
          }
        ],
        as: 'category'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        pipeline: [
          {
            $project: { _id: 1, firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'createdBy'
      }
    }
  ])
}

export {
  createProduct, findProduct, findAllProduct, updateProduct,
  deleteProduct,
  findProductWithAggregationCount,
  findProductHistory,
  findProductWithAggregation,
  updateMultipleProducts,
  createMultipleProducts
}
