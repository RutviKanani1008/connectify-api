import { EmailTemplates } from '../models/emailTemplate'
import { parseData } from '../utils/utils'
import { ObjectId } from 'mongodb'

export const findEmailTemplateWithAggregationCount = ({ match }) => {
  return EmailTemplates.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findEmailTemplateWithAggregation = ({ match, skip, limit, sort, project }) => {
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
  return EmailTemplates.aggregate([
    {
      $match: { ...match }
    },
    {
      $lookup: {
        from: 'folders',
        localField: 'folder',
        foreignField: '_id',
        as: 'folder'
      }
    },
    {
      $unwind: {
        path: '$folder',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $sort
    },
    { $project },
    { $skip: skip },
    { $limit: limit }
  ])
}

export const getFilterEmailTemplatesQuery = ({ filters, currentUser }) => {
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

const findEmailTemplates = (params, projection = {}, populate = []) => {
  return EmailTemplates.find(params, projection).populate(populate).sort({ createdAt: -1 })
}

const findOneEmailTemplate = (params, projection = {}) => {
  return EmailTemplates.findOne(params, projection)
}

const createEmailTemplate = (data) => {
  return EmailTemplates.create(data)
}

const updateEmailTemplate = (search, data) => {
  return EmailTemplates.findByIdAndUpdate(search, data)
}

const deleteEmailTemplates = (params) => {
  return EmailTemplates.delete(params)
}

const updateManyEmailTemplate = (search, updateValue, updateMulti) => {
  return EmailTemplates.update(search, updateValue, updateMulti)
}

export {
  findOneEmailTemplate,
  findEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplates,
  updateManyEmailTemplate
}
