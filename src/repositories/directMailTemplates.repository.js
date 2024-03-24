import { DirectMailTemplates } from '../models/directMailTemplate'
import { parseData } from '../utils/utils'
import { ObjectId } from 'mongodb'

export const findDirectMailTemplateWithAggregationCount = ({ match }) => {
  return DirectMailTemplates.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findDirectMailTemplateWithAggregation = ({ match, skip, limit, sort, project }) => {
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
  return DirectMailTemplates.aggregate([
    {
      $match: { ...match }
    },
    {
      $sort
    },
    { $project },
    { $skip: skip },
    { $limit: limit }
  ])
}

export const getFilterDirectMailTemplatesQuery = ({ filters, currentUser }) => {
  let { sort, search } = filters
  sort = parseData(sort)
  // remove company id for super admin
  const $and = [{ company: ObjectId(currentUser.company) }]
  if (search) {
    const reg = new RegExp(search, 'i')
    $and.push({
      $or: [{ name: { $regex: reg } }, { subject: { $regex: reg } }]
    })
  }
  if (!sort) sort = { createdAt: -1 }
  return { query: { ...($and.length ? { $and } : {}) }, sort }
}

const findDirectMailTemplates = (params, projection = {}, populate = []) => {
  return DirectMailTemplates.find(params, projection).populate(populate).sort({ createdAt: -1 })
}

const findOneDirectMailTemplate = (params, projection = {}, populate = []) => {
  return DirectMailTemplates.findOne(params, projection).populate(populate)
}

const createDirectMailTemplate = (data) => {
  return DirectMailTemplates.create(data)
}

const updateDirectMailTemplateRepo = (search, data) => {
  return DirectMailTemplates.findByIdAndUpdate(search, data)
}

const deleteDirectMailTemplates = (params) => {
  return DirectMailTemplates.delete(params)
}

export const directMailTemplatesBulkWrite = (orderObjArray) => {
  return DirectMailTemplates.bulkWrite(orderObjArray)
}

export {
  findOneDirectMailTemplate,
  findDirectMailTemplates,
  createDirectMailTemplate,
  updateDirectMailTemplateRepo,
  deleteDirectMailTemplates
}
