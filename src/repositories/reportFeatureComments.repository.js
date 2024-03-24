import { ReportFeatureComments } from '../models/reportFeatureComments'

export const findAllComments = ({
  params = {},
  projection = {},
  populate = [],
  sort = { createdAt: -1 },
  option = {}
}) => {
  return ReportFeatureComments.find(params, projection, option).sort(sort).populate(populate)
}

export const findComment = (params = {}) => ReportFeatureComments.findOne(params)

export const createComment = (data) => ReportFeatureComments.create(data)

export const updateComment = (id, data) => ReportFeatureComments.updateOne(id, data)

export const countComments = (params) => ReportFeatureComments.count(params)

export const deleteComment = (id) => ReportFeatureComments.delete(id)
