import { Document } from '../models/document'
import { parseData } from '../utils/utils'
import { ObjectId } from 'mongodb'

export const findDocumentByIdRepo = (id) => {
  return Document.findById(id)
}

export const getFilterDocumentsQuery = ({ filters, currentUser }) => {
  let { sort, search } = filters
  sort = parseData(sort)
  const $and = [{ company: ObjectId(currentUser.company), archived: filters.archived === 'true' }]
  if (search) {
    const reg = new RegExp(search, 'i')
    $and.push({
      $or: [{ name: { $regex: reg } }, { document: { $regex: reg } }]
    })
  }
  if (!sort) sort = { order: -1 }
  return { query: { ...($and.length ? { $and } : {}) }, sort }
}

export const findDocumentWithAggregationCount = ({ match }) => {
  return Document.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findDocumentWithAggregation = ({ match, skip, limit, sort, project }) => {
  let $sort = {}
  if (sort && Object.keys(sort).length) {
    $sort = sort
  } else {
    $sort = { order: -1 }
  }

  const $project = {
    ...(project && Object.keys(project).length
      ? { ...project }
      : {
          _id: 1
        })
  }
  return Document.aggregate([
    {
      $match: { ...match }
    },
    { $project },
    {
      $sort
    },
    { $skip: skip },
    { $limit: limit }
  ])
}

export const findAllDocumentRepo = (params, projection = {}, sort = {}) => {
  return Document.find(params, projection).sort(sort)
}

export const createDocumentRepo = (data) => {
  return Document.create(data)
}
export const getAllDocumentCountRepo = (where = {}) => {
  return Document.where({ ...where }).count()
}

export const updateDocumentRepo = (search, updateValue) => {
  return Document.updateOne(search, updateValue)
}

export const updateManyDocument = (search, updateValue, updateMulti) => {
  return Document.update(search, updateValue, updateMulti)
}

export const deleteDocumentRepo = (params) => {
  return Document.delete(params)
}

export const updateDocumentOrderRepo = (orderObjArray) => {
  const tempOrderObjArray = orderObjArray?.map((obj) => ({
    updateOne: {
      filter: {
        _id: obj._id
      },
      update: {
        order: obj.order
      }
    }
  }))
  return Document.bulkWrite(tempOrderObjArray)
}

export const bulkUpdateDocuments = (documents) => {
  const tempOrderObjArray = documents?.map((obj) => ({
    updateOne: { filter: { _id: obj._id }, update: obj.updateValue }
  }))
  return Document.bulkWrite(tempOrderObjArray)
}
