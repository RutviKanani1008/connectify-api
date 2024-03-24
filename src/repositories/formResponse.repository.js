import { FormResponse } from '../models/formResponse'

const findFormsResponse = (params, projection = {}, populate) => {
  return FormResponse.findOne(params, projection).populate(populate)
}

const findAllFormsResponse = (params, projection = {}, sort = {}) => {
  return FormResponse.find(params, projection).sort(sort)
}

const createFormsResponse = (data) => {
  return FormResponse.create(data)
}

const updateFormResponse = (search, updateValue) => {
  return FormResponse.updateOne(search, updateValue)
}

const findFormsResponsePopulate = (params, populate) => {
  return FormResponse.findOne(params).populate(populate)
}

const deleteFormResponse = (params) => {
  return FormResponse.delete(params)
}

const findFormResponseWithAggregationCount = ({ match, search = null }) => {
  return FormResponse.aggregate([
    {
      $match: { ...match }
    },
    ...(search
      ? [
          {
            $addFields: {
              responseArray: {
                $objectToArray: '$response'
              }
            }
          },
          {
            $match: {
              $or: [{ 'responseArray.k': { $regex: search } }, { 'responseArray.v': { $regex: search } }]
            }
          }
        ]
      : []),
    { $count: 'count' }
  ])
}

const findFormResponsetWithAggregation = ({ match, skip, limit, search = null }) => {
  return FormResponse.aggregate([
    {
      $match: { ...match }
    },
    ...(search
      ? [
          {
            $addFields: {
              responseArray: {
                $objectToArray: '$response'
              }
            }
          },
          {
            $match: {
              $or: [{ 'responseArray.k': { $regex: search } }, { 'responseArray.v': { $regex: search } }]
            }
          }
        ]
      : []),
    { $skip: skip },
    { $limit: limit }
  ])
}

export {
  findFormsResponse,
  findAllFormsResponse,
  createFormsResponse,
  updateFormResponse,
  findFormsResponsePopulate,
  deleteFormResponse,
  findFormResponseWithAggregationCount,
  findFormResponsetWithAggregation
}
