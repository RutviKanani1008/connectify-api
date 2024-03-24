import { Envelope } from '../models/envelope'

export const findEnvelopeWithAggregationCount = ({ match }) => {
  return Envelope.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findEnvelopeWithAggregation = ({ match, skip, limit, sort, project }) => {
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
  return Envelope.aggregate([
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

const findOneEnvelope = (params, projection = {}) => {
  return Envelope.findOne(params, projection)
}

const createEnvelope = (data) => {
  return Envelope.create(data)
}

const updateEnvelopeRepo = (search, data) => {
  return Envelope.findByIdAndUpdate(search, data)
}

const deleteEnvelopeRepo = (params) => {
  return Envelope.delete(params)
}

export { findOneEnvelope, createEnvelope, updateEnvelopeRepo, deleteEnvelopeRepo }
