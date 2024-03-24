import { Users } from '../models/users'
import { ObjectId } from 'mongodb'
import { parseData } from '../utils/utils'

const findUser = (params, projection = {}, populate = []) => {
  return Users.findOne(params, projection).populate(populate)
}

const getFilterUserQuery = ({ filters, currentUser }) => {
  let { sort, search } = filters
  sort = parseData(sort)
  const $and = [{ company: ObjectId(currentUser.company) }]
  if (search) {
    const reg = new RegExp(search, 'i')
    $and.push({
      $or: [
        { firstName: { $regex: reg } },
        { lastName: { $regex: reg } },
        { email: { $regex: reg } },
        { address1: { $regex: reg } },
        { address2: { $regex: reg } },
        { phone: { $regex: reg } }
      ]
    })
  }
  if (!sort) sort = { createdAt: -1 }
  return { query: { ...($and.length ? { $and } : {}) }, sort }
}

const findUserWithAggregationCount = ({ match }) => {
  return Users.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

const findUserWithAggregation = ({ match, skip, limit, sort, project }) => {
  let $sort = {}
  if (sort && Object.keys(sort).length) {
    $sort = sort
  } else {
    $sort = { createdAt: -1 }
  }

  if (project.password) {
    delete project.password
  }
  if (project.verificationCode) {
    delete project.verificationCode
  }
  if (project.authCode) {
    delete project.authCode
  }

  const $project = {
    ...(project && Object.keys(project).length
      ? { ...project }
      : {
          _id: 1
        })
  }
  return Users.aggregate([
    {
      $match: { ...match }
    },
    { $project: { ...$project, createdAt: 1 } },
    {
      $sort
    },
    { $skip: skip },
    { $limit: limit }
  ])
}

const findAllUser = (params, projection = {}, populate = []) => {
  return Users.find(params, projection).sort({ createdAt: -1 }).populate(populate)
}

const createUser = (data) => {
  return Users.create(data)
}

const updateUser = (search, updateValue) => {
  return Users.updateOne(search, updateValue)
}

const deleteUser = (params) => {
  return Users.delete(params)
}

const findUserUsingAggregate = (params, populate, projection) => {
  return Users.findOne(params, projection).populate(populate)
}

const findMultipleUsers = (params) => {
  return Users.find({
    _id: {
      $in: params.map((id) => ObjectId(id))
    }
  })
}

const findCompanyAdminUser = (companyId, params, projection) => {
  return Users.find({ company: ObjectId(companyId), role: 'admin', ...params }, projection)
}

const findUserWithNotificationSettings = async (
  companyId,
  match = {},
  projection = {},
  eventModule,
  notificationDetail = [],
  notificationType
) => {
  const pipeline = [
    {
      $match: {
        company: ObjectId(companyId),
        active: true,
        ...match
      }
    },
    {
      $lookup: {
        from: 'user-notification-settings',
        localField: '_id',
        foreignField: 'user',
        as: 'notificationSettings'
      }
    },
    {
      $match: {
        'notificationSettings.notifications': {
          $elemMatch: {
            eventModule,
            notificationDetail: { $in: notificationDetail }
          }
        }
      }
    },
    {
      $unwind: {
        path: '$notificationSettings',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: '$notificationSettings.notifications',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        'notificationSettings.notifications.eventModule': eventModule,
        'notificationSettings.notifications.notificationDetail': { $in: notificationDetail },
        ...(notificationType
          ? {
              'notificationSettings.notifications.notificationType': {
                $elemMatch: {
                  $eq: notificationType
                }
              }
            }
          : {
              'notificationSettings.notifications.notificationType': {
                $exists: true,
                $ne: []
              }
            })
      }
    },
    {
      $group: {
        _id: '$_id',
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        email: { $first: '$email' },
        userProfile: { $first: '$userProfile' },
        active: { $first: '$active' },
        notificationModes: { $addToSet: '$notificationSettings.notifications.notificationType' },
        notificationDetails: {
          $push: {
            k: '$notificationSettings.notifications.notificationDetail',
            v: '$notificationSettings.notifications.notificationType'
          }
        }
      }
    },
    {
      $project: {
        ...projection,
        notificationDetails: {
          $arrayToObject: '$notificationDetails'
        },
        notificationModes: {
          $reduce: {
            input: '$notificationModes',
            initialValue: [],
            in: { $setUnion: ['$$value', '$$this'] }
          }
        }
      }
    }
  ]

  return Users.aggregate(pipeline)
}

export {
  createUser,
  findUser,
  findAllUser,
  updateUser,
  deleteUser,
  findUserUsingAggregate,
  findUserWithAggregation,
  findUserWithAggregationCount,
  getFilterUserQuery,
  findMultipleUsers,
  findCompanyAdminUser,
  findUserWithNotificationSettings
}
