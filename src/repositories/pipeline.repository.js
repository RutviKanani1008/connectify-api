import { Pipeline } from '../models/pipeline'

const findPipeline = (params) => {
  return Pipeline.findOne(params)
}

const findAllPipeline = (params, projection = {}, sort = {}) => {
  return Pipeline.find(params, projection).sort(sort)
}

const createPipeline = (data) => {
  return Pipeline.create(data)
}

const updatePipeline = (search, updateValue) => {
  return Pipeline.updateOne(search, updateValue)
}

const findPipelinePopulate = (params, populate) => {
  return Pipeline.findOne(params).populate(populate)
}

const deletePipeline = (params) => {
  return Pipeline.delete(params)
}

export { findPipeline, findAllPipeline, createPipeline, updatePipeline, findPipelinePopulate, deletePipeline }
