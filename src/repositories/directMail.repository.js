import { DirectMail } from '../models/direct-mail'
import { ObjectId } from 'mongodb'

const findDirectMail = (params, projection = {}, populate) => {
  return DirectMail.findOne(params, projection).populate(populate)
}

export const findDirectMailWithAggregationCount = ({ match }) => {
  return DirectMail.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findDirectMailWithAggregation = ({ match, skip, limit, sort, project }) => {
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
  return DirectMail.aggregate([
    {
      $match: { ...match }
    },
    {
      $sort
    },
    {
      $lookup: {
        from: 'contacts',
        let: { contact: '$contacts' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$contact']
              }
            }
          },
          {
            $project: {
              _id: 1
            }
            //   firstName: 1,
            //   lastName: 1
            // }
          }
        ],
        as: 'contacts'
      }
    },
    {
      $lookup: {
        from: 'direct-mail-templates',
        localField: 'directMailTemplate',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1
            }
          }
        ],
        as: 'directMailTemplate'
      }
    },
    {
      $unwind: {
        path: '$directMailTemplate',
        preserveNullAndEmptyArrays: true
      }
    },
    { $addFields: { totalContacts: { $size: '$contacts' } } },
    { $project },
    { $skip: skip },
    { $limit: limit }
  ])
}

const findAllDirectMail = (params) => {
  const { company, ...rest } = params
  return DirectMail.aggregate([
    {
      $match: {
        company: ObjectId(company),
        ...rest
      }
    },
    { $addFields: { contacts: { $size: '$contacts' } } },
    {
      $sort: {
        createdAt: -1
      }
    }
  ])
}

const createDirectMail = (data) => {
  return DirectMail.create(data)
}

const updateDirectMail = (search, updateValue) => {
  return DirectMail.updateOne(search, updateValue)
}

const deleteDirectMail = (params) => {
  return DirectMail.delete(params)
}

export { createDirectMail, findDirectMail, findAllDirectMail, updateDirectMail, deleteDirectMail }
