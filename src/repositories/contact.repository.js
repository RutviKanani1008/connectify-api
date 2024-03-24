import { customParse, getSelectParams } from '../helpers/generalHelper'
import { Contacts } from '../models/contacts'
import mongoose from 'mongoose'
import Stripe from 'stripe'
import { parseData } from '../utils/utils'
import _ from 'lodash'
const { isObjectIdOrHexString } = mongoose

const ObjectId = mongoose.Types.ObjectId

const findContact = (params, populate, projection = {}) => {
  return Contacts.findOne(params, projection).populate(populate)
}

const findContactWithDeleted = (params, populate) => {
  return Contacts.findWithDeleted(params).populate(populate)
}

const findAllContact = (params, projection = {}, sort = {}, populate) => {
  return Contacts.find(params, projection).sort(customParse(sort)).populate(populate)
}

const findAllContactWithAggregate = (data) => {
  return Contacts.aggregate(data)
}

const createContact = (data) => {
  return Contacts.create(data)
}

const createBillingContact = ({ firstName, lastName, email, phone, address1, address2 }) => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY)

  const contactObj = {
    email,
    name: `${firstName} ${lastName}`,
    ...(phone && { phone }),
    ...(address1 && { address: { line1: address1 || '', line2: address2 || '' } })
  }

  return stripe.customers.create(contactObj)
}

const deleteBillingContact = (billingId) => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY)
  return stripe.customers.del(billingId)
}

const updateContactAPI = (search, updateValue) => {
  return Contacts.updateOne(search, updateValue, { upsert: true })
}

const updateManyContactAPI = (search, updateValue) => {
  return Contacts.updateMany(search, updateValue, { upsert: true })
}

const updateMultipleContact = (contactArrayObj) => {
  return Contacts.bulkWrite(contactArrayObj)
}

const createMultipleContact = (contactArrayObj) => {
  return Contacts.insertMany(contactArrayObj)
}

const findContactPopulate = (params, populate, project = {}) => {
  return Contacts.findOne(params, project).populate(populate)
}

const findContactProjecttion = (params, projection, populate) => {
  return Contacts.findOne(params, projection).populate(populate)
}

const deleteContact = (params) => {
  return Contacts.delete(params)
}

const getContactsWithRsvp = (company, eventId) => {
  return Contacts.aggregate([
    {
      $match: { company: new ObjectId(company), deleted: false, archived: false }
    },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'eventrsvps',
        let: { contactID: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ['$contact', '$$contactID'] }, { $eq: ['$event', new ObjectId(eventId)] }] }
            }
          },
          {
            $project: { are_you_coming: 1 }
          }
        ],
        as: 'eventrsvp'
      }
    }
  ])
}

const getFilterContactsQuery = ({ filters, currentUser }) => {
  let { sort, search } = filters
  sort = parseData(sort)
  const $and = [{ company: ObjectId(currentUser.company) }]

  const updatedFilters = { ...filters }
  const { status, category, tags, pipeline, stage } = updatedFilters

  if (search) {
    const reg = new RegExp(search, 'i')
    $and.push({
      $or: [
        { firstName: { $regex: reg } },
        { lastName: { $regex: reg } },
        { company_name: { $regex: reg } },
        { email: { $regex: reg } }
      ]
    })
  }

  $and.push({ archived: updatedFilters.archived === 'true' })

  if (updatedFilters.hasUnsubscribed) {
    $and.push({ hasUnsubscribed: updatedFilters.hasUnsubscribed === 'true' })
  }

  if (updatedFilters['group.id'] === 'unAssigned' || updatedFilters['group.id']) {
    $and.push(
      updatedFilters['group.id'] === 'unAssigned'
        ? { group: null }
        : { 'group.id': ObjectId(updatedFilters['group.id']) }
    )
  }

  if (status) {
    $and.push(status === 'UnassignedItem' ? { status: null } : { 'status.id': ObjectId(status) })
  }

  if (category) {
    $and.push(category === 'UnassignedItem' ? { category: null } : { 'category.id': ObjectId(category) })
  }

  if (tags?.length) {
    $and.push(
      tags?.includes('UnassignedItem') ? { tags: [] } : { tags: { $in: [...tags?.map((tag) => ObjectId(tag))] } }
    )
  }

  if (pipeline) {
    $and.push(
      pipeline === 'UnassignedItem'
        ? { pipelineDetails: [] }
        : {
            'pipelineDetails.pipeline.id': { $in: [ObjectId(pipeline)] },
            ...(stage
              ? stage === 'UnassignedItem'
                ? { 'pipelineDetails.status': null }
                : { 'pipelineDetails.status.id': { $in: [ObjectId(stage)] } }
              : {})
          }
    )
  }

  const query = { ...($and.length ? { $and } : {}) }

  if (!sort) sort = { createdAt: -1 }
  return { query, sort }
}

const getContactsWithAggregate = async (req) => {
  const query = {
    match: {},
    select: { '-__v': -1 },
    sort: { createdAt: -1 }
  }
  if (req.query['group.id'] === 'unAssigned') {
    req.query.group = null
    delete req.query['group.id']
  }
  const { status, category, tags, pipeline, stage, ...rest } = req.query
  const queryObj = { ...rest }
  const search = queryObj.search || ''
  const reg = new RegExp(search, 'i')

  if (search) {
    query.match.$or = [
      { firstName: { $regex: reg } },
      { lastName: { $regex: reg } },
      { company_name: { $regex: reg } },
      { email: { $regex: reg } },
      { fullName: { $regex: reg } },
      { website: { $regex: reg } },
      { phone: { $regex: reg } }
    ]
  }

  if (queryObj.sort) {
    let sort = queryObj.sort
    sort = parseData(sort) || []
    query.sort = sort
  }

  if (queryObj.select) {
    query.select = getSelectParams(req)
  }

  const page = queryObj.page * 1 || 1
  const limit = queryObj.limit * 1 || 10
  const skip = limit * (page - 1)

  const excludedFields = ['page', 'sort', 'limit', 'select', 'include', 'search']
  excludedFields.forEach((data) => delete queryObj[data])
  let queryStr = JSON.stringify(queryObj)

  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`)
  queryStr = JSON.parse(queryStr)
  query.match = { ...query.match, ...queryStr }
  query.match.archived = query.match.archived === 'true'
  if (query.match.hasUnsubscribed) {
    query.match.hasUnsubscribed = query.match.hasUnsubscribed === 'true'
  }
  query.match.company = queryStr.company ? ObjectId(queryObj.company) : null
  if (queryStr['group.id']) {
    query.match['group.id'] = ObjectId(queryStr['group.id'])
  }

  const results = await Contacts.aggregate([
    {
      $match: {
        ...query.match,
        ...(status
          ? status === 'UnassignedItem'
            ? { status: null }
            : {
                'status.id': ObjectId(status)
              }
          : {}),

        ...(category
          ? category === 'UnassignedItem'
            ? { category: null }
            : {
                'category.id': ObjectId(category)
              }
          : {}),

        ...(tags?.length
          ? tags?.includes('UnassignedItem')
            ? { tags: [] }
            : {
                tags: { $in: [...tags?.map((tag) => ObjectId(tag))] }
              }
          : {}),

        ...(pipeline
          ? pipeline === 'UnassignedItem'
            ? { pipelineDetails: [] }
            : {
                'pipelineDetails.pipeline.id': { $in: [ObjectId(pipeline)] },
                ...(stage
                  ? stage === 'UnassignedItem'
                    ? { 'pipelineDetails.status': null }
                    : {
                        'pipelineDetails.status.id': { $in: [ObjectId(stage)] }
                      }
                  : {})
              }
          : {})
      }
    },
    {
      $lookup: {
        from: 'groups',
        localField: 'group.id',
        foreignField: '_id',
        pipeline: [
          {
            $project: { _id: 1, groupName: 1 }
          }
        ],
        as: 'group'
      }
    },
    {
      $unwind: {
        path: '$group',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        pipeline: [
          {
            $project: { _id: 1, name: 1 }
          }
        ],
        as: 'company'
      }
    },
    {
      $unwind: {
        path: '$company',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: { createdAt: 1, ...query.select }
    },
    {
      $sort: query.sort
    },
    { $skip: skip },
    { $limit: limit }
  ])
  const total = await Contacts.count({
    ...query.match,
    ...(status
      ? status === 'UnassignedItem'
        ? { status: null }
        : {
            'status.id': ObjectId(status)
          }
      : {}),

    ...(category
      ? category === 'UnassignedItem'
        ? { category: null }
        : {
            'category.id': ObjectId(category)
          }
      : {}),

    ...(tags?.length
      ? tags?.includes('UnassignedItem')
        ? { tags: [] }
        : {
            tags: { $in: [...tags?.map((tag) => ObjectId(tag))] }
          }
      : {}),

    ...(pipeline
      ? pipeline === 'UnassignedItem'
        ? { pipelineDetails: [] }
        : {
            'pipelineDetails.pipeline.id': { $in: [ObjectId(pipeline)] },
            ...(stage
              ? stage === 'UnassignedItem'
                ? { 'pipelineDetails.status': null }
                : {
                    'pipelineDetails.status.id': { $in: [ObjectId(stage)] }
                  }
              : {})
          }
      : {})
  })
  const unsSubscribedCount = await Contacts.count({ ...query.match, hasUnsubscribed: true })
  return { results, total, unsSubscribedCount }
}

const getStageContactsAggregate = async ({ match, pageNumber = 1, limit = 10, aggregateOn }) => {
  const projectFields = {
    firstName: 1,
    lastName: 1,
    phone: 1,
    company_name: 1,
    email: 1,
    userProfile: 1,
    ...(aggregateOn === 'group' ? { groupHistory: 1 } : {}),
    ...(aggregateOn === 'category' ? { categoryHistory: 1 } : {}),
    ...(aggregateOn === 'status' ? { statusHistory: 1 } : {}),
    ...(aggregateOn === 'pipeline' ? { pipelineDetails: 1 } : {}),
    [aggregateOn]: 1,
    group: 1
  }
  const aggregatePipeline = [
    {
      $match: match
    },
    { $project: projectFields },
    ...(aggregateOn === 'group'
      ? [
          {
            $lookup: {
              from: 'groups',
              localField: 'group.id',
              foreignField: '_id',
              as: 'stage'
            }
          }
        ]
      : []),
    ...(aggregateOn === 'status'
      ? [
          {
            $lookup: {
              from: 'status',
              localField: 'status.id',
              foreignField: '_id',
              as: 'stage'
            }
          }
        ]
      : []),
    ...(aggregateOn === 'category'
      ? [
          {
            $lookup: {
              from: 'categories',
              localField: 'category.id',
              foreignField: '_id',
              as: 'stage'
            }
          }
        ]
      : []),
    ...(aggregateOn === 'pipeline'
      ? [
          { $unwind: '$pipelineDetails' },
          {
            $lookup: {
              from: 'pipelines',
              let: { pipelineId: '$pipelineDetails.pipeline.id', stageId: '$pipelineDetails.status.id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$_id', '$$pipelineId'] } } },
                {
                  $project: {
                    stage: {
                      $arrayElemAt: [
                        { $filter: { input: '$stages', as: 'item', cond: { $eq: ['$$item._id', '$$stageId'] } } },
                        0
                      ]
                    }
                  }
                }
              ],
              as: 'stage'
            }
          },
          { $replaceRoot: { newRoot: { $mergeObjects: ['$$ROOT', { stage: '$stage.stage' }] } } }
        ]
      : []),
    { $unwind: { path: '$stage', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$stage._id', ...(aggregateOn === 'group' ? ['unAssigned'] : ['unassignedItem'])] },
        stage: { $first: '$stage' },
        contacts: { $push: '$$ROOT' },
        total: { $sum: 1 }
      }
    },
    {
      $addFields: {
        // THIS IS TEMPORARY FIX - UNTIL INFINTE SCROLL IS IMPLEMENTED
        contacts: {
          $slice: ['$contacts', (pageNumber - 1) * limit, limit]
        }
        // hasMoreContacts: {
        //   $cond: {
        //     if: { $gt: [{ $size: '$contacts' }, limit] },
        //     then: false, // SET IT TO "TRUE"
        //     else: false
        //   }
        // }
      }
    }
  ]

  return Contacts.aggregate(aggregatePipeline)
}

const getSelectedContactsWithFilters = async (contactFilters, pagination = false) => {
  const query = {
    match: {},
    select: { '-__v': -1 },
    sort: { createdAt: -1 }
  }

  if (contactFilters['group.id'] === 'unAssigned') {
    contactFilters.group = null
    delete contactFilters['group.id']
  }

  const { exceptions_contacts, group, status, category, tags, pipeline, stage, ...rest } = contactFilters

  const queryObj = { ...rest }

  /* Search in filterd selected contacts */
  const mainSearch = queryObj.mainSearch || ''
  const search = queryObj.search || ''
  const reg = new RegExp(search, 'i')

  if (exceptions_contacts?.length) {
    const exceptionalContactIds = (exceptions_contacts || []).map((id) => ObjectId(id))
    query.match._id = { $nin: exceptionalContactIds }
  }

  if (group && _.isArray(group) && group.length) {
    if (group.includes('UnassignedItem')) {
      query.match.$or = [
        {
          'group.id': {
            $in: group
              .map((value) => {
                if (value !== 'UnassignedItem') {
                  return isObjectIdOrHexString(value) ? mongoose.Types.ObjectId(value) : value
                }
                return null
              })
              .filter((el) => Boolean(el))
          }
        },
        {
          group: null
        }
      ]
    } else {
      query.match['group.id'] = {
        $in: group.map((value) => (isObjectIdOrHexString(value) ? mongoose.Types.ObjectId(value) : value))
      }
    }
  }

  if (queryObj.select) {
    query.select = queryObj.select
  }

  if (mainSearch) {
    const mainSearchReg = new RegExp(mainSearch, 'i')
    query.match.$and = [
      {
        $or: [
          { firstName: { $regex: mainSearchReg } },
          { lastName: { $regex: mainSearchReg } },
          { company_name: { $regex: mainSearchReg } },
          { email: { $regex: mainSearchReg } }
        ]
      },
      {
        ...(search && {
          $or: [
            { firstName: { $regex: reg } },
            { lastName: { $regex: reg } },
            { company_name: { $regex: reg } },
            { email: { $regex: reg } }
          ]
        })
      }
    ]
  } else {
    if (search) {
      if (query.match.$or) {
        query.match.$or.push(
          ...[
            { firstName: { $regex: reg } },
            { lastName: { $regex: reg } },
            { company_name: { $regex: reg } },
            { email: { $regex: reg } }
          ]
        )
      } else {
        query.match.$or = [
          { firstName: { $regex: reg } },
          { lastName: { $regex: reg } },
          { company_name: { $regex: reg } },
          { email: { $regex: reg } }
        ]
      }
    }
  }

  if (queryObj.sort) {
    let sort = queryObj.sort
    sort = parseData(sort) || []
    query.sort = sort
  }

  const page = queryObj.page * 1 || 1
  const limit = queryObj.limit * 1 || 10
  const skip = limit * (page - 1)

  const excludedFields = [
    'page',
    'sort',
    'limit',
    'select',
    'include',
    'search',
    'mainSearch',
    'is_all_selected',
    'selected_contacts'
  ]
  excludedFields.forEach((data) => delete queryObj[data])
  let queryStr = JSON.stringify(queryObj)

  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`)
  queryStr = JSON.parse(queryStr)
  query.match = { ...query.match, ...queryStr }
  query.match.archived = query.match.archived === true || query.match.archived === 'true'
  if (query.match.hasUnsubscribed) {
    query.match.hasUnsubscribed = query.match.hasUnsubscribed === true || query.match.hasUnsubscribed === 'true'
  }
  query.match.company = queryStr.company ? ObjectId(queryObj.company) : null
  if (queryStr['group.id']) {
    query.match['group.id'] = ObjectId(queryStr['group.id'])
  }

  const contacts = await Contacts.aggregate(
    [
      {
        $match: {
          ...query.match,
          ...(status
            ? status === 'UnassignedItem'
              ? { status: null }
              : {
                  'status.id': ObjectId(status)
                }
            : {}),

          ...(category
            ? category === 'UnassignedItem'
              ? { category: null }
              : {
                  'category.id': ObjectId(category)
                }
            : {}),

          ...(tags?.length
            ? tags?.includes('UnassignedItem')
              ? { tags: [] }
              : {
                  tags: { $in: [...tags?.map((tag) => ObjectId(tag))] }
                }
            : {}),

          ...(pipeline
            ? pipeline === 'UnassignedItem'
              ? { pipelineDetails: [] }
              : {
                  'pipelineDetails.pipeline.id': { $in: [ObjectId(pipeline)] },
                  ...(stage
                    ? stage === 'UnassignedItem'
                      ? { 'pipelineDetails.status': null }
                      : {
                          'pipelineDetails.status.id': { $in: [ObjectId(stage)] }
                        }
                    : {})
                }
            : {})
        }
      },
      {
        $lookup: {
          from: 'groups',
          localField: 'group.id',
          foreignField: '_id',
          pipeline: [
            {
              $project: { _id: 1, groupName: 1 }
            }
          ],
          as: 'group'
        }
      },
      { $unwind: { path: '$group', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          pipeline: [{ $project: { _id: 1, name: 1 } }],
          as: 'company'
        }
      },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      { $project: { createdAt: 1, ...query.select } },
      { $sort: query.sort },
      { ...(pagination && skip && { $skip: skip }) },
      { ...(pagination && { $limit: limit }) }
    ].filter((obj) => Object.keys(obj).length !== 0)
  )

  const total = await Contacts.count({
    ...query.match,
    ...(status
      ? status === 'UnassignedItem'
        ? { status: null }
        : {
            'status.id': ObjectId(status)
          }
      : {}),

    ...(category
      ? category === 'UnassignedItem'
        ? { category: null }
        : {
            'category.id': ObjectId(category)
          }
      : {}),

    ...(tags?.length
      ? tags?.includes('UnassignedItem')
        ? { tags: [] }
        : {
            tags: { $in: [...tags?.map((tag) => ObjectId(tag))] }
          }
      : {}),

    ...(pipeline
      ? pipeline === 'UnassignedItem'
        ? { pipelineDetails: [] }
        : {
            'pipelineDetails.pipeline.id': { $in: [ObjectId(pipeline)] },
            ...(stage
              ? stage === 'UnassignedItem'
                ? { 'pipelineDetails.status': null }
                : {
                    'pipelineDetails.status.id': { $in: [ObjectId(stage)] }
                  }
              : {})
          }
      : {})
  })

  return { contacts, total }
}

const getCountContact = (query) => {
  return Contacts.count(query)
}

const generateOrConditionsForStageContacts = (stages, field, unassignedValue) => {
  const orConditions = [
    {
      [`${field}.id`]: {
        $in: stages.flatMap((stage) => (stage !== unassignedValue ? [ObjectId(stage)] : []))
      }
    }
  ]
  if (stages.includes(unassignedValue)) {
    orConditions.push({ [field]: null })
  }

  return orConditions
}

const findAllContactWithPagination = async (match, project = {}, sort = { createdAt: -1 }, skip = 0, limit = 10) => {
  const aggregationPipeline = [
    {
      $match: match
    },
    {
      $sort: sort
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    },
    {
      $project: project
    }
  ]

  const [contacts, total] = await Promise.all([Contacts.aggregate(aggregationPipeline), Contacts.count(match)])

  return [contacts, total]
}

export {
  getCountContact,
  getContactsWithAggregate,
  getFilterContactsQuery,
  getSelectedContactsWithFilters,
  findContact,
  findAllContact,
  createContact,
  createBillingContact,
  deleteBillingContact,
  updateContactAPI,
  findContactPopulate,
  updateMultipleContact,
  deleteContact,
  findContactWithDeleted,
  getContactsWithRsvp,
  createMultipleContact,
  updateManyContactAPI,
  findAllContactWithAggregate,
  getStageContactsAggregate,
  findContactProjecttion,
  generateOrConditionsForStageContacts,
  findAllContactWithPagination
}
