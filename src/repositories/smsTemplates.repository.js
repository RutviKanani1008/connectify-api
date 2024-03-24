import { SMSTemplates } from '../models/smsTemplate'
import { parseData } from '../utils/utils'
import { ObjectId } from 'mongodb'

const findSmsTemplates = (params, projection = {}) => {
  return SMSTemplates.find(params, projection).sort({ createdAt: -1 })
}

export const findSmsTemplateWithAggregationCount = ({ match }) => {
  return SMSTemplates.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findSmsTemplateWithAggregation = ({ match, skip, limit, sort, project }) => {
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
  return SMSTemplates.aggregate([
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

export const getFilterSmsTemplatesQuery = ({ filters, currentUser }) => {
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

const findOneSmsTemplate = (params, projection = {}) => {
  return SMSTemplates.findOne(params, projection)
}

const createSmsTemplate = (data) => {
  return SMSTemplates.create(data)
}

const updateSmsTemplate = (search, data) => {
  return SMSTemplates.findByIdAndUpdate(search, data)
}

const deleteSmsTemplates = (params) => {
  return SMSTemplates.delete(params)
}

export { findOneSmsTemplate, findSmsTemplates, createSmsTemplate, updateSmsTemplate, deleteSmsTemplates }
