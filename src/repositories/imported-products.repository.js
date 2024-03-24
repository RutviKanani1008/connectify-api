import { ImportedProducts } from '../models/imported-products'

export const createBulkImportProducts = (orderObjArray) => {
  return ImportedProducts.insertMany(orderObjArray)
}

export const findImportProductWithAggregationCount = ({ match }) => {
  return ImportedProducts.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findImportProduct = (params) => {
  return ImportedProducts.findOne(params)
}

export const updateImportProduct = (search, updateValue) => {
  return ImportedProducts.updateOne(search, updateValue)
}

export const findImportProductWithAggregationErrorCount = ({ match }) => {
  return ImportedProducts.aggregate([
    {
      $match: { ...match }
    },
    {
      $group: {
        _id: null,
        isTitleNotExists: {
          $sum: {
            $cond: [{ $eq: ['$productErrors.isTitleNotExists', true] }, 1, 0]
          }
        },
        isQuantityNotExists: {
          $sum: {
            $cond: [{ $eq: ['$productErrors.isQuantityNotExists', true] }, 1, 0]
          }
        },
        isQuantityNotNumber: {
          $sum: {
            $cond: [{ $eq: ['$productErrors.isQuantityNotNumber', true] }, 1, 0]
          }
        },
        isSku: {
          $sum: {
            $cond: [{ $eq: ['$contactErrors.isSku', true] }, 1, 0]
          }
        }
      }
    }
  ])
}

export const findImportProductsWithAggregation = ({ match, skip, limit, project }) => {
  const $project = {
    ...(project && Object.keys(project).length
      ? { ...project }
      : {
          _id: 1
        })
  }
  return ImportedProducts.aggregate([
    {
      $match: { ...match }
    },
    { $project },
    { $skip: skip },
    { $limit: limit }
  ])
}

export const findAllImportProducts = (params) => {
  return ImportedProducts.find(params).sort({ createdAt: -1 })
}

export const multipleDeleteImportProduct = (params) => {
  return ImportedProducts.deleteMany(params)
}

export const deleteImportProduct = (params) => {
  return ImportedProducts.delete(params)
}
