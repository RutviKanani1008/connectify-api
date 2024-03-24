import { Forms } from '../models/forms'
import { parseData } from '../utils/utils'
import { ObjectId } from 'mongodb'

const findForms = (params, projection = {}, populate) => {
  return Forms.findOne(params, projection).populate(populate)
}

export const getFilterFormsQuery = ({ filters, currentUser }) => {
  let { sort, search } = filters
  sort = parseData(sort)
  const $and = [{ archived: filters.archived === 'true' }]

  if (currentUser.company) {
    $and.push({ company: ObjectId(currentUser.company) })
  }
  if (search) {
    const reg = new RegExp(search, 'i')
    $and.push({
      $or: [{ title: { $regex: reg } }, { description: { $regex: reg } }, { slug: { $regex: reg } }]
    })
  }
  if (!sort) sort = { createdAt: -1 }
  return { query: { ...($and.length ? { $and } : {}) }, sort }
}

export const findFormWithAggregationCount = ({ match }) => {
  return Forms.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findFormtWithAggregation = ({ match, skip, limit, sort, project }) => {
  let $sort = {}
  if (sort && Object.keys(sort).length) {
    $sort = sort
  } else {
    $sort = { createdAt: -1 }
  }

  const $project = {
    ...(project && Object.keys(project).length
      ? { ...project, createdAt: 1 }
      : {
          _id: 1,
          createdAt: 1
        })
  }
  return Forms.aggregate([
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

const getFormResponse = (params, populate) => {
  return Forms.findOne(params)
    .select({ autoresponder: true, fields: true, notification: true, company: true })
    .populate(populate)
}

const findAllForms = (params, projection = {}, sort = {}) => {
  return Forms.find(params, projection).sort(sort)
}

const createForms = (data) => {
  return Forms.create(data)
}

const updateForm = (search, updateValue) => {
  return Forms.updateOne(search, updateValue)
}

const findFormsPopulate = (params, populate) => {
  return Forms.findOne(params).populate(populate)
}

const deleteForm = (params) => {
  return Forms.delete(params)
}

export { findForms, findAllForms, createForms, updateForm, findFormsPopulate, deleteForm, getFormResponse }
