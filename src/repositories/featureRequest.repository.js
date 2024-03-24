import { FeatureRequest } from '../models/featureRequest'

const createFeatureRequest = (data) => FeatureRequest.create(data)

const countFeatureRequest = (params = {}) => FeatureRequest.count(params)

const updateFeatureRequest = (params, data) => FeatureRequest.update(params, data)

const removeFeatureRequestById = (data) => FeatureRequest.delete(data)

const getFeatureRequest = (params, projections, populate) =>
  FeatureRequest.findOne(params, projections).populate(populate)

const findAllFeatureRequests = (
  params,
  projection = {},
  paginationConf = { skip: 0, limit: 10 },
  sort = { createdAt: -1 },
  populate
) => {
  return FeatureRequest.find(params, projection, paginationConf).sort(sort).populate(populate)
}

export {
  createFeatureRequest,
  countFeatureRequest,
  findAllFeatureRequests,
  getFeatureRequest,
  updateFeatureRequest,
  removeFeatureRequestById
}
