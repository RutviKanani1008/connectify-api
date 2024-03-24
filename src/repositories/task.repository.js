import { Tasks } from '../models/tasks'
import { parseData } from '../utils/utils'
import { ObjectId } from 'mongodb'

const findOneTask = (params, projection = {}) => {
  const taskPopulateFields = [
    { path: 'status' },
    { path: 'priority' },
    { path: 'category' },
    { path: 'labels' },
    { path: 'contact', select: { firstName: 1, lastName: 1, email: 1, company_name: 1, userProfile: 1 } },
    { path: 'checklistDetails.checklistTemplate', select: { name: 1, folder: 1 } },
    { path: 'assigned', select: { firstName: 1, lastName: 1, email: 1, userProfile: 1 } },
    { path: 'createdBy', select: { firstName: 1, lastName: 1, email: 1, role: 1, userProfile: 1 } },
    { path: 'checklistDetails.checklist.updatedBy', select: { firstName: 1, lastName: 1, email: 1 } }
  ]

  return Tasks.findOne(params, projection).populate([
    ...taskPopulateFields,
    { path: 'parent_task', select: { taskNumber: 1, name: 1 } }
  ])
}

const findOneTaskDetail = (params, projection = {}, populate = []) => {
  return Tasks.findOne(params, projection).populate(populate)
}

const findTotalTasks = (params) => {
  return Tasks.find(params).countDocuments().exec()
}

const findAllTasksWithAggregateCount = ({ match, extraParams, groupFilter, snoozeDetailMatch = {}, currentUserId }) => {
  return Tasks.aggregate([
    ...(extraParams
      ? [
          {
            $lookup: {
              from: 'tasks',
              localField: '_id',
              foreignField: 'parent_task',
              pipeline: [
                {
                  $match: {
                    trash: false,
                    ...extraParams.subTaskFilter,
                    company: match.company
                  }
                },
                {
                  $project: {
                    status: 1,
                    priority: 1,
                    category: 1,
                    contact: 1,
                    assigned: 1,
                    frequency: 1,
                    name: 1,
                    taskNumber: 1,
                    completed: 1,
                    trash: 1
                  }
                }
              ],
              as: 'sub_tasks'
            }
          }
        ]
      : []),
    {
      $match: { ...match }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'contact',
        foreignField: '_id',
        as: 'contact'
      }
    },
    {
      $match: {
        ...(groupFilter.group
          ? groupFilter.group === 'Unassigned'
            ? { 'contact.group': null }
            : {
                'contact.group.id': ObjectId(parseData(groupFilter.group))
              }
          : {}),

        ...(groupFilter.groupStatus
          ? groupFilter.groupStatus === 'UnassignedItem'
            ? { 'contact.status': null }
            : {
                'contact.status.id': ObjectId(parseData(groupFilter.groupStatus))
              }
          : {}),

        ...(groupFilter.category
          ? groupFilter.category === 'UnassignedItem'
            ? { 'contact.category': null }
            : {
                'contact.category.id': ObjectId(parseData(groupFilter.category))
              }
          : {}),

        ...(groupFilter.tags?.length
          ? groupFilter.tags?.includes('UnassignedItem')
            ? { 'contact.tags': [] }
            : {
                'contact.tags': { $in: [...parseData(groupFilter.tags)?.map((tag) => ObjectId(tag))] }
              }
          : {}),

        ...(groupFilter.pipeline
          ? groupFilter.pipeline === 'UnassignedItem'
            ? { 'contact.pipelineDetails': [] }
            : {
                'contact.pipelineDetails.pipeline.id': { $in: [ObjectId(parseData(groupFilter.pipeline))] },
                ...(groupFilter.pipelineStage
                  ? groupFilter.pipelineStage === 'UnassignedItem'
                    ? { 'contact.pipelineDetails.status': null }
                    : {
                        'contact.pipelineDetails.status.id': { $in: [ObjectId(parseData(groupFilter.pipelineStage))] }
                      }
                  : {})
              }
          : {})
      }
    },
    {
      $lookup: {
        from: 'snoozedusertasks',
        let: {
          taskId: '$_id'
        },
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId)
                }
              ]
            }
          }
        ],
        as: 'snoozeDetail'
      }
    },
    {
      $unwind: {
        path: '$snoozeDetail',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: { ...snoozeDetailMatch }
    },
    { $count: 'count' }
  ])
}

const findAllTasksWithAggregate = ({
  match,
  skip,
  limit,
  project,
  extraParams,
  sort,
  groupFilter,
  currentUserId,
  snoozeDetailMatch = {}
}) => {
  let $sort = {}

  if (sort?.column && sort?.order) {
    if (sort.column === 'priority') {
      $sort = {
        'priorityObj.order': sort?.order,
        ...(sort?.order === 1 ? { 'priorityObj.createdAt': -1 } : { 'priorityObj.createdAt': 1 })
      }
    } else if (sort.column === 'status') {
      $sort = {
        'statusObj.order': sort?.order,
        ...(sort?.order === 1 ? { 'statusObj.createdAt': -1 } : { 'statusObj.createdAt': 1 })
      }
    } else if (sort.column === 'contact') {
      $sort = { 'contact.firstName': sort?.order }
    } else if (sort.column === 'assigned') {
      $sort = { assigneeName: sort?.order }
    } else {
      $sort = { [sort?.column]: sort?.order }
    }
  } else {
    $sort = { pinned: -1, order: 1, createdAt: -1 }
  }

  $sort = { 'snoozeDetail.snoozeUntil': 1, ...$sort }
  return Tasks.aggregate([
    ...(extraParams
      ? [
          {
            $lookup: {
              from: 'tasks',
              localField: '_id',
              foreignField: 'parent_task',
              pipeline: [
                {
                  $match: {
                    trash: false,
                    ...extraParams.subTaskFilter,
                    company: match.company
                  }
                },
                {
                  $lookup: {
                    from: 'snoozedusertasks',
                    let: {
                      taskId: '$_id'
                    },
                    pipeline: [
                      {
                        $match: {
                          $and: [
                            {
                              $expr: { $eq: ['$$taskId', '$task'] }
                            },
                            {
                              user: new ObjectId(currentUserId)
                            }
                          ]
                        }
                      }
                    ],
                    as: 'snoozeDetail'
                  }
                },
                {
                  $unwind: {
                    path: '$snoozeDetail',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $match: { ...snoozeDetailMatch }
                },
                {
                  $project: {
                    status: 1,
                    priority: 1,
                    category: 1,
                    contact: 1,
                    assigned: 1,
                    frequency: 1,
                    name: 1,
                    taskNumber: 1,
                    completed: 1,
                    trash: 1,
                    snoozeDetail: 1
                  }
                }
              ],
              as: 'sub_tasks'
            }
          }
        ]
      : []),

    {
      $match: { ...match }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assigned',
        foreignField: '_id',
        pipeline: [
          {
            $project: { userProfile: 1, firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'assigned'
      }
    },
    {
      $lookup: {
        from: 'pinnedusertasks',
        localField: '_id',
        foreignField: 'taskId',
        pipeline: [
          {
            $match: {
              userId: ObjectId(currentUserId)
            }
          },
          {
            $project: { pinned: 1 }
          }
        ],
        as: 'pinnedusertasks'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'priority',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1, color: 1 }
          }
        ],
        as: 'priorityObj'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'status',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1 }
          }
        ],
        as: 'statusObj'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'category',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1 }
          }
        ],
        as: 'categoryObj'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        pipeline: [
          {
            $project: { firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'createdBy'
      }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'contact',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              userProfile: 1,
              company_name: 1,
              company: 1,
              group: 1,
              status: 1,
              category: 1,
              tags: 1,
              pipelineDetails: 1
            }
          }
        ],

        as: 'contact'
      }
    },
    {
      $lookup: {
        from: 'taskupdates',
        localField: '_id',
        foreignField: 'task',
        as: 'updates',
        pipeline: [
          {
            $match: {
              deleted: false
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              pipeline: [
                {
                  $project: { firstName: 1, lastName: 1, email: 1 }
                }
              ],
              as: 'createdBy'
            }
          },
          {
            $project: { content: 1, createdAt: 1, createdBy: { $arrayElemAt: ['$createdBy', 0] } }
          }
        ]
      }
    },
    {
      $addFields: {
        latestUpdates: { $arrayElemAt: ['$updates', -1] }
      }
    },
    {
      $match: {
        ...(groupFilter.group
          ? groupFilter.group === 'Unassigned'
            ? { 'contact.group': null }
            : {
                'contact.group.id': ObjectId(parseData(groupFilter.group))
              }
          : {}),

        ...(groupFilter.groupStatus
          ? groupFilter.groupStatus === 'UnassignedItem'
            ? { 'contact.status': null }
            : {
                'contact.status.id': ObjectId(parseData(groupFilter.groupStatus))
              }
          : {}),

        ...(groupFilter.groupCategory
          ? groupFilter.groupCategory === 'UnassignedItem'
            ? { 'contact.category': null }
            : {
                'contact.category.id': ObjectId(parseData(groupFilter.groupCategory))
              }
          : {}),

        ...(groupFilter.tags?.length
          ? groupFilter.tags?.includes('UnassignedItem')
            ? { 'contact.tags': [] }
            : {
                'contact.tags': { $in: [...parseData(groupFilter.tags)?.map((tag) => ObjectId(tag))] }
              }
          : {}),

        ...(groupFilter.pipeline
          ? groupFilter.pipeline === 'UnassignedItem'
            ? { 'contact.pipelineDetails': [] }
            : {
                'contact.pipelineDetails.pipeline.id': { $in: [ObjectId(parseData(groupFilter.pipeline))] },
                ...(groupFilter.pipelineStage
                  ? groupFilter.pipelineStage === 'UnassignedItem'
                    ? { 'contact.pipelineDetails.status': null }
                    : {
                        'contact.pipelineDetails.status.id': { $in: [ObjectId(parseData(groupFilter.pipelineStage))] }
                      }
                  : {})
              }
          : {})
      }
    },
    {
      $lookup: {
        from: 'snoozedusertasks',
        let: {
          taskId: '$_id'
        },
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId)
                }
              ]
            }
          }
        ],
        as: 'snoozeDetail'
      }
    },
    {
      $unwind: {
        path: '$snoozeDetail',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: { ...snoozeDetailMatch }
    },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'tasknotifyusers',
        let: {
          taskId: '$_id'
        },
        // localField: '_id',
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId),
                  notificationFor: 'new-update',
                  deleted: false
                }
              ]
            }
          }
        ],
        as: 'isUnreadUpdates'
      }
    },
    {
      $project: {
        latestUpdates: 1,
        sub_tasks: 1,
        // isUnreadUpdates : 1,
        isUnreadUpdates: {
          $cond: {
            if: {
              $size: ['$isUnreadUpdates']
            },
            then: true,
            else: false
          }
        },
        // assigned: 1,
        createdAt: 1,
        order: 1,
        snoozeDetail: 1,
        priorityObj: 1,
        statusObj: 1,
        // categoryObj: 1,
        taskNumber: 1,
        assigneeName: { $arrayElemAt: ['$assigned.firstName', 0] },
        pinned: { $arrayElemAt: ['$pinnedusertasks.pinned', 0] },
        ...project,
        contact: { firstName: 1, lastName: 1, email: 1, userProfile: 1, company_name: 1, company: 1, _id: 1 }
      }
    },
    {
      $sort: {
        ...$sort,
        pinned: -1
      }
    }
  ])
}
const findAllTasksWithAggregateForExport = ({
  match,
  skip,
  limit,
  project,
  extraParams,
  sort,
  groupFilter,
  currentUserId,
  snoozeDetailMatch
}) => {
  let $sort = {}

  if (sort?.column && sort?.order) {
    if (sort.column === 'priority') {
      $sort = {
        'priorityObj.order': sort?.order,
        ...(sort?.order === 1 ? { 'priorityObj.createdAt': -1 } : { 'priorityObj.createdAt': 1 })
      }
    } else if (sort.column === 'status') {
      $sort = {
        'statusObj.order': sort?.order,
        ...(sort?.order === 1 ? { 'statusObj.createdAt': -1 } : { 'statusObj.createdAt': 1 })
      }
    } else if (sort.column === 'contact') {
      $sort = { 'contact.firstName': sort?.order }
    } else if (sort.column === 'assigned') {
      $sort = { assigneeName: sort?.order }
    } else {
      $sort = { [sort?.column]: sort?.order }
    }
  } else {
    $sort = { pinned: -1, order: 1, createdAt: -1 }
  }

  $sort = { 'snoozeDetail.snoozeUntil': 1, ...$sort }

  return Tasks.aggregate([
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'parent_task',
        pipeline: [
          {
            $match: {
              trash: false,
              ...extraParams.subTaskFilter,
              company: match.company
            }
          },
          {
            $lookup: {
              from: 'snoozedusertasks',
              let: {
                taskId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    $and: [
                      {
                        $expr: { $eq: ['$$taskId', '$task'] }
                      },
                      {
                        user: new ObjectId(currentUserId)
                      }
                    ]
                  }
                }
              ],
              as: 'snoozeDetail'
            }
          },
          {
            $unwind: {
              path: '$snoozeDetail',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: { ...snoozeDetailMatch }
          },
          {
            $project: {
              status: 1,
              priority: 1,
              category: 1,
              contact: 1,
              assigned: 1,
              frequency: 1,
              name: 1,
              taskNumber: 1,
              completed: 1,
              trash: 1,
              snoozeDetail: 1,
              startDate: 1,
              endDate: 1
            }
          }
        ],
        as: 'sub_tasks'
      }
    },
    {
      $lookup: {
        from: 'tasks',
        localField: 'parent_task',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              name: 1,
              completed: 1,
              trash: 1
            }
          }
        ],
        as: 'parent_task'
      }
    },
    {
      $match: { ...match }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assigned',
        foreignField: '_id',
        pipeline: [
          {
            $project: { userProfile: 1, firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'assigned'
      }
    },
    {
      $lookup: {
        from: 'pinnedusertasks',
        localField: '_id',
        foreignField: 'taskId',
        pipeline: [
          {
            $match: {
              userId: ObjectId(currentUserId)
            }
          },
          {
            $project: { pinned: 1 }
          }
        ],
        as: 'pinnedusertasks'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'priority',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1, label: 1 }
          }
        ],
        as: 'priorityObj'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'status',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1, label: 1 }
          }
        ],
        as: 'statusObj'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'category',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1, label: 1 }
          }
        ],
        as: 'categoryObj'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        pipeline: [
          {
            $project: { firstName: 1, lastName: 1, email: 1, company_name: 1 }
          }
        ],
        as: 'createdBy'
      }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'contact',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              userProfile: 1,
              company_name: 1,
              company: 1,
              group: 1,
              status: 1,
              category: 1,
              tags: 1,
              pipelineDetails: 1
            }
          }
        ],
        as: 'contact'
      }
    },
    {
      $match: {
        ...(groupFilter.group
          ? groupFilter.group === 'Unassigned'
            ? { 'contact.group': null }
            : {
                'contact.group.id': ObjectId(parseData(groupFilter.group))
              }
          : {}),

        ...(groupFilter.groupStatus
          ? groupFilter.groupStatus === 'UnassignedItem'
            ? { 'contact.status': null }
            : {
                'contact.status.id': ObjectId(parseData(groupFilter.groupStatus))
              }
          : {}),

        ...(groupFilter.category
          ? groupFilter.category === 'UnassignedItem'
            ? { 'contact.category': null }
            : {
                'contact.category.id': ObjectId(parseData(groupFilter.category))
              }
          : {}),

        ...(groupFilter.tags?.length
          ? groupFilter.tags?.includes('UnassignedItem')
            ? { 'contact.tags': [] }
            : {
                'contact.tags': { $in: [...parseData(groupFilter.tags)?.map((tag) => ObjectId(tag))] }
              }
          : {}),

        ...(groupFilter.pipeline
          ? groupFilter.pipeline === 'UnassignedItem'
            ? { 'contact.pipelineDetails': [] }
            : {
                'contact.pipelineDetails.pipeline.id': { $in: [ObjectId(parseData(groupFilter.pipeline))] },
                ...(groupFilter.pipelineStage
                  ? groupFilter.pipelineStage === 'UnassignedItem'
                    ? { 'contact.pipelineDetails.status': null }
                    : {
                        'contact.pipelineDetails.status.id': { $in: [ObjectId(parseData(groupFilter.pipelineStage))] }
                      }
                  : {})
              }
          : {})
      }
    },
    {
      $lookup: {
        from: 'snoozedusertasks',
        let: {
          taskId: '$_id'
        },
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId)
                }
              ]
            }
          }
        ],
        as: 'snoozeDetail'
      }
    },
    {
      $unwind: {
        path: '$snoozeDetail',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: { ...snoozeDetailMatch }
    },
    {
      $project: {
        sub_tasks: 1,
        assigned: 1,
        createdAt: 1,
        order: 1,
        priorityObj: 1,
        statusObj: 1,
        categoryObj: 1,
        assigneeName: { $arrayElemAt: ['$assigned.firstName', 0] },
        pinned: { $arrayElemAt: ['$pinnedusertasks.pinned', 0] },
        ...project
      }
    },
    {
      $sort: {
        ...$sort,
        pinned: -1
      }
    },
    { $skip: skip },
    { $limit: limit }
  ])
}

const findAllTasksWithAggregateWithoutLimit = ({ match, project, sort, currentUserId, snoozeDetailMatch }) => {
  let $sort = {}

  if (sort?.column && sort?.order) {
    if (sort.column === 'priority') {
      $sort = {
        'priorityObj.order': sort?.order,
        ...(sort?.order === 1 ? { 'priorityObj.createdAt': -1 } : { 'priorityObj.createdAt': 1 })
      }
    } else if (sort.column === 'status') {
      $sort = {
        'statusObj.order': sort?.order,
        ...(sort?.order === 1 ? { 'statusObj.createdAt': -1 } : { 'statusObj.createdAt': 1 })
      }
    } else if (sort.column === 'contact') {
      $sort = { 'contact.firstName': sort?.order }
    } else if (sort.column === 'assigned') {
      $sort = { assigneeName: sort?.order }
    } else {
      $sort = { [sort?.column]: sort?.order }
    }
  } else {
    $sort = { pinned: -1, order: 1, createdAt: -1 }
  }

  $sort = { 'snoozeDetail.snoozeUntil': 1, ...$sort }

  return Tasks.aggregate([
    {
      $match: { ...match }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assigned',
        foreignField: '_id',
        as: 'assigned'
      }
    },
    {
      $lookup: {
        from: 'pinnedusertasks',
        localField: '_id',
        foreignField: 'taskId',
        pipeline: [
          {
            $match: {
              userId: ObjectId(currentUserId)
            }
          },
          {
            $project: { pinned: 1 }
          }
        ],
        as: 'pinnedusertasks'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'priority',
        foreignField: '_id',
        as: 'priorityObj'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'status',
        foreignField: '_id',
        as: 'statusObj'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryObj'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdBy'
      }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'contact',
        foreignField: '_id',
        pipeline: [
          {
            $project: { firstName: 1, lastName: 1, email: 1, userProfile: 1, company_name: 1, company: 1 }
          }
        ],
        as: 'contact'
      }
    },
    {
      $lookup: {
        from: 'taskupdates',
        localField: '_id',
        foreignField: 'task',
        as: 'updates',
        pipeline: [
          {
            $match: {
              deleted: false
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              pipeline: [
                {
                  $project: { firstName: 1, lastName: 1, email: 1 }
                }
              ],
              as: 'createdBy'
            }
          },
          {
            $project: { content: 1, createdAt: 1, createdBy: { $arrayElemAt: ['$createdBy', 0] } }
          }
        ]
      }
    },
    {
      $addFields: {
        latestUpdates: { $arrayElemAt: ['$updates', -1] }
      }
    },
    {
      $lookup: {
        from: 'tasknotifyusers',
        let: {
          taskId: '$_id'
        },
        // localField: '_id',
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId),
                  notificationFor: 'new-update',
                  deleted: false
                }
              ]
            }
          }
        ],
        as: 'isUnreadUpdates'
      }
    },
    {
      $lookup: {
        from: 'snoozedusertasks',
        let: {
          taskId: '$_id'
        },
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId)
                }
              ]
            }
          }
        ],
        as: 'snoozeDetail'
      }
    },
    {
      $unwind: {
        path: '$snoozeDetail',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: { ...snoozeDetailMatch }
    },
    {
      $sort
    },
    ...(project
      ? [
          {
            $project: {
              latestUpdates: 1,
              // assigned: 1,
              // createdAt: 1,
              order: 1,
              // priorityObj: 1,
              // statusObj: 1,
              // categoryObj: 1,
              snoozeDetail: 1,
              isUnreadUpdates: {
                $cond: {
                  if: {
                    $size: ['$isUnreadUpdates']
                  },
                  then: true,
                  else: false
                }
              },
              pinned: { $arrayElemAt: ['$pinnedusertasks.pinned', 0] },
              ...project
            }
          }
        ]
      : [])
  ])
}

const findAllTasksWithAggregateById = ({ match, skip, limit, project }) => {
  return Tasks.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'parent_task',
        pipeline: [
          {
            $match: {
              trash: false,
              completed: false
            }
          },
          {
            $count: 'count'
          }
        ],
        as: 'sub_tasks'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assigned',
        foreignField: '_id',
        pipeline: [
          {
            $project: { userProfile: 1, firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'assigned'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        pipeline: [
          {
            $project: { firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'createdBy'
      }
    },
    {
      $unwind: { path: '$sub_tasks', preserveNullAndEmptyArrays: true }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'contact',
        foreignField: '_id',
        as: 'contact',
        pipeline: [
          {
            $project: { firstName: 1, lastName: 1, email: 1, userProfile: 1, company_name: 1, company: 1 }
          }
        ]
      }
    },
    {
      $lookup: {
        from: 'taskupdates',
        localField: '_id',
        foreignField: 'task',
        as: 'updates',
        pipeline: [
          {
            $match: {
              deleted: false
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              pipeline: [
                {
                  $project: { firstName: 1, lastName: 1, email: 1 }
                }
              ],
              as: 'createdBy'
            }
          },
          {
            $project: { content: 1, createdAt: 1, createdBy: { $arrayElemAt: ['$createdBy', 0] } }
          }
        ]
      }
    },
    {
      $addFields: {
        latestUpdates: { $arrayElemAt: ['$updates', -1] }
      }
    },
    {
      $project: { sub_tasks: 1, assigned: 1, createdAt: 1, order: 1, latestUpdates: 1, ...project }
    },
    { $sort: { order: 1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ])
}

const findAllTasks = ({ params = {}, projection = {}, populate = [], sort = { createdAt: -1 }, option = {} }) => {
  return Tasks.find(params, projection, option).sort(sort).populate(populate)
}

const createTasks = (data, populate = []) => {
  return Tasks.insertMany(data, { populate })
}

const updateTask = (search, updateValue, populate = []) => {
  return Tasks.updateOne(search, updateValue).populate(populate)
}

const updateTasks = (search, updateValue, populate = [], option = {}) => {
  return Tasks.updateMany(search, updateValue, option).populate(populate)
}

const deleteTasks = (tasks) => {
  return Tasks.delete(tasks)
}

export const taskBulkWrite = (orderObjArray) => {
  return Tasks.bulkWrite(orderObjArray)
}

const findLastTask = ({ params = {}, projection = {} } = {}) => {
  return Tasks.findOne(params, projection).sort({ _id: -1 })
}

const findTaskWithDeleted = ({ params, projection = {}, option = {}, sort = { _id: 1 } }) => {
  return Tasks.findWithDeleted(params, projection, option).sort(sort)
}

const updateOneTaskWithDeleted = (params, updateValue, option) => {
  return Tasks.updateOneWithDeleted(params, updateValue, option)
}

const findTasksOptionCount = ({ match, groupFilter, currentUserId, snoozeDetailMatch }) => {
  return Tasks.aggregate([
    {
      $match: { ...match }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'contact',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              userProfile: 1,
              company_name: 1,
              company: 1,
              group: 1,
              status: 1,
              category: 1,
              tags: 1,
              pipelineDetails: 1
            }
          }
        ],

        as: 'contact'
      }
    },
    {
      $match: {
        ...(groupFilter.group
          ? groupFilter.group === 'Unassigned'
            ? { 'contact.group': null }
            : {
                'contact.group.id': ObjectId(parseData(groupFilter.group))
              }
          : {}),

        ...(groupFilter.groupStatus
          ? groupFilter.groupStatus === 'UnassignedItem'
            ? { 'contact.status': null }
            : {
                'contact.status.id': ObjectId(parseData(groupFilter.groupStatus))
              }
          : {}),

        ...(groupFilter.groupCategory
          ? groupFilter.groupCategory === 'UnassignedItem'
            ? { 'contact.category': null }
            : {
                'contact.category.id': ObjectId(parseData(groupFilter.groupCategory))
              }
          : {}),

        ...(groupFilter.tags?.length
          ? groupFilter.tags?.includes('UnassignedItem')
            ? { 'contact.tags': [] }
            : {
                'contact.tags': { $in: [...parseData(groupFilter.tags)?.map((tag) => ObjectId(tag))] }
              }
          : {}),

        ...(groupFilter.pipeline
          ? groupFilter.pipeline === 'UnassignedItem'
            ? { 'contact.pipelineDetails': [] }
            : {
                'contact.pipelineDetails.pipeline.id': { $in: [ObjectId(parseData(groupFilter.pipeline))] },
                ...(groupFilter.pipelineStage
                  ? groupFilter.pipelineStage === 'UnassignedItem'
                    ? { 'contact.pipelineDetails.status': null }
                    : {
                        'contact.pipelineDetails.status.id': { $in: [ObjectId(parseData(groupFilter.pipelineStage))] }
                      }
                  : {})
              }
          : {})
      }
    },
    {
      $lookup: {
        from: 'snoozedusertasks',
        let: {
          taskId: '$_id'
        },
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId)
                }
              ]
            }
          }
        ],
        as: 'snoozeDetail'
      }
    },
    {
      $unwind: {
        path: '$snoozeDetail',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: { ...snoozeDetailMatch }
    },
    {
      $group: {
        _id: '$category',
        totalTask: {
          $sum: 1
        }
      }
    }
  ])
}

const findAllSnoozedTasksCounts = ({ match, extraParams, groupFilter, currentUserId }) => {
  return Tasks.aggregate([
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'parent_task',
        pipeline: [
          {
            $match: {
              trash: false,
              ...extraParams.subTaskFilter,
              company: match.company
            }
          },
          {
            $lookup: {
              from: 'snoozedusertasks',
              let: {
                taskId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    $and: [
                      {
                        $expr: { $eq: ['$$taskId', '$task'] }
                      },
                      {
                        user: new ObjectId(currentUserId)
                      }
                    ]
                  }
                }
              ],
              as: 'snoozeDetail'
            }
          },
          {
            $unwind: {
              path: '$snoozeDetail',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              snoozeDetail: 1
            }
          }
        ],
        as: 'sub_tasks'
      }
    },
    {
      $match: { ...match }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assigned',
        foreignField: '_id',
        pipeline: [
          {
            $project: { userProfile: 1, firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'assigned'
      }
    },
    {
      $lookup: {
        from: 'pinnedusertasks',
        localField: '_id',
        foreignField: 'taskId',
        pipeline: [
          {
            $match: {
              userId: ObjectId(currentUserId)
            }
          },
          {
            $project: { pinned: 1 }
          }
        ],
        as: 'pinnedusertasks'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'priority',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1 }
          }
        ],
        as: 'priorityObj'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'status',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1 }
          }
        ],
        as: 'statusObj'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'category',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1 }
          }
        ],
        as: 'categoryObj'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        pipeline: [
          {
            $project: { firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'createdBy'
      }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'contact',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              userProfile: 1,
              company_name: 1,
              company: 1,
              group: 1,
              status: 1,
              category: 1,
              tags: 1,
              pipelineDetails: 1
            }
          }
        ],

        as: 'contact'
      }
    },
    {
      $lookup: {
        from: 'taskupdates',
        localField: '_id',
        foreignField: 'task',
        as: 'updates',
        pipeline: [
          {
            $match: {
              deleted: false
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              pipeline: [
                {
                  $project: { firstName: 1, lastName: 1, email: 1 }
                }
              ],
              as: 'createdBy'
            }
          },
          {
            $project: { content: 1, createdAt: 1, createdBy: { $arrayElemAt: ['$createdBy', 0] } }
          }
        ]
      }
    },
    {
      $addFields: {
        latestUpdates: { $arrayElemAt: ['$updates', -1] }
      }
    },
    {
      $match: {
        ...(groupFilter.group
          ? groupFilter.group === 'Unassigned'
            ? { 'contact.group': null }
            : {
                'contact.group.id': ObjectId(parseData(groupFilter.group))
              }
          : {}),

        ...(groupFilter.groupStatus
          ? groupFilter.groupStatus === 'UnassignedItem'
            ? { 'contact.status': null }
            : {
                'contact.status.id': ObjectId(parseData(groupFilter.groupStatus))
              }
          : {}),

        ...(groupFilter.groupCategory
          ? groupFilter.groupCategory === 'UnassignedItem'
            ? { 'contact.category': null }
            : {
                'contact.category.id': ObjectId(parseData(groupFilter.groupCategory))
              }
          : {}),

        ...(groupFilter.tags?.length
          ? groupFilter.tags?.includes('UnassignedItem')
            ? { 'contact.tags': [] }
            : {
                'contact.tags': { $in: [...parseData(groupFilter.tags)?.map((tag) => ObjectId(tag))] }
              }
          : {}),

        ...(groupFilter.pipeline
          ? groupFilter.pipeline === 'UnassignedItem'
            ? { 'contact.pipelineDetails': [] }
            : {
                'contact.pipelineDetails.pipeline.id': { $in: [ObjectId(parseData(groupFilter.pipeline))] },
                ...(groupFilter.pipelineStage
                  ? groupFilter.pipelineStage === 'UnassignedItem'
                    ? { 'contact.pipelineDetails.status': null }
                    : {
                        'contact.pipelineDetails.status.id': { $in: [ObjectId(parseData(groupFilter.pipelineStage))] }
                      }
                  : {})
              }
          : {})
      }
    },
    {
      $lookup: {
        from: 'snoozedusertasks',
        let: {
          taskId: '$_id'
        },
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId)
                }
              ]
            }
          }
        ],
        as: 'snoozeDetail'
      }
    },
    {
      $project: {
        totakSnoozedTasks: {
          $size: ['$snoozeDetail']
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSnoozedTasks: {
          $sum: '$totakSnoozedTasks'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalSnoozedTasks: 1
      }
    }
  ])
}

const findAllTasksWithTotalTask = ({
  match,
  skip,
  limit,
  project,
  extraParams,
  sort,
  groupFilter,
  currentUserId,
  snoozeDetailMatch = {},
  snoozedTask
}) => {
  let $sort = {}

  if (sort?.column && sort?.order) {
    if (sort.column === 'priority') {
      $sort = {
        'priorityObj.order': sort?.order,
        ...(sort?.order === 1 ? { 'priorityObj.createdAt': -1 } : { 'priorityObj.createdAt': 1 })
      }
    } else if (sort.column === 'status') {
      $sort = {
        'statusObj.order': sort?.order,
        ...(sort?.order === 1 ? { 'statusObj.createdAt': -1 } : { 'statusObj.createdAt': 1 })
      }
    } else if (sort.column === 'contact') {
      $sort = { 'contact.firstName': sort?.order }
    } else if (sort.column === 'assigned') {
      $sort = { assigneeName: sort?.order }
    } else {
      $sort = { [sort?.column]: sort?.order }
    }
  } else {
    $sort = { pinned: -1, order: 1, createdAt: -1 }
  }

  if (snoozedTask === 'true') {
    $sort = { 'snoozeDetail.snoozeUntil': 1, ...$sort }
  }

  return Tasks.aggregate([
    ...(extraParams
      ? [
          {
            $lookup: {
              from: 'tasks',
              localField: '_id',
              foreignField: 'parent_task',
              pipeline: [
                {
                  $match: {
                    trash: false,
                    ...extraParams.subTaskFilter,
                    company: match.company
                  }
                },
                {
                  $lookup: {
                    from: 'snoozedusertasks',
                    let: {
                      taskId: '$_id'
                    },
                    pipeline: [
                      {
                        $match: {
                          $and: [
                            {
                              $expr: { $eq: ['$$taskId', '$task'] }
                            },
                            {
                              user: new ObjectId(currentUserId)
                            }
                          ]
                        }
                      }
                    ],
                    as: 'snoozeDetail'
                  }
                },
                {
                  $unwind: {
                    path: '$snoozeDetail',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $match: { ...snoozeDetailMatch }
                },
                {
                  $project: {
                    status: 1,
                    priority: 1,
                    category: 1,
                    contact: 1,
                    assigned: 1,
                    frequency: 1,
                    name: 1,
                    taskNumber: 1,
                    completed: 1,
                    trash: 1,
                    snoozeDetail: 1
                  }
                }
              ],
              as: 'sub_tasks'
            }
          }
        ]
      : []),
    {
      $match: { ...match }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assigned',
        foreignField: '_id',
        pipeline: [
          {
            $project: { userProfile: 1, firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'assigned'
      }
    },
    {
      $lookup: {
        from: 'pinnedusertasks',
        localField: '_id',
        foreignField: 'taskId',
        pipeline: [
          {
            $match: {
              userId: ObjectId(currentUserId)
            }
          },
          {
            $project: { pinned: 1 }
          }
        ],
        as: 'pinnedusertasks'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'priority',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1, color: 1 }
          }
        ],
        as: 'priorityObj'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'status',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1 }
          }
        ],
        as: 'statusObj'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'category',
        foreignField: '_id',
        pipeline: [
          {
            $project: { order: 1, createdAt: 1 }
          }
        ],
        as: 'categoryObj'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        pipeline: [
          {
            $project: { firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'createdBy'
      }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'contact',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              userProfile: 1,
              company_name: 1,
              company: 1,
              group: 1,
              status: 1,
              category: 1,
              tags: 1,
              pipelineDetails: 1
            }
          }
        ],

        as: 'contact'
      }
    },
    {
      $lookup: {
        from: 'taskupdates',
        localField: '_id',
        foreignField: 'task',
        as: 'updates',
        pipeline: [
          {
            $match: {
              deleted: false
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              pipeline: [
                {
                  $project: { firstName: 1, lastName: 1, email: 1 }
                }
              ],
              as: 'createdBy'
            }
          },
          {
            $project: { content: 1, createdAt: 1, createdBy: { $arrayElemAt: ['$createdBy', 0] } }
          }
        ]
      }
    },
    {
      $addFields: {
        latestUpdates: { $arrayElemAt: ['$updates', -1] }
      }
    },
    {
      $match: {
        ...(groupFilter.group
          ? groupFilter.group === 'Unassigned'
            ? { 'contact.group': null }
            : {
                'contact.group.id': ObjectId(parseData(groupFilter.group))
              }
          : {}),

        ...(groupFilter.groupStatus
          ? groupFilter.groupStatus === 'UnassignedItem'
            ? { 'contact.status': null }
            : {
                'contact.status.id': ObjectId(parseData(groupFilter.groupStatus))
              }
          : {}),

        ...(groupFilter.groupCategory
          ? groupFilter.groupCategory === 'UnassignedItem'
            ? { 'contact.category': null }
            : {
                'contact.category.id': ObjectId(parseData(groupFilter.groupCategory))
              }
          : {}),

        ...(groupFilter.tags?.length
          ? groupFilter.tags?.includes('UnassignedItem')
            ? { 'contact.tags': [] }
            : {
                'contact.tags': { $in: [...parseData(groupFilter.tags)?.map((tag) => ObjectId(tag))] }
              }
          : {}),

        ...(groupFilter.pipeline
          ? groupFilter.pipeline === 'UnassignedItem'
            ? { 'contact.pipelineDetails': [] }
            : {
                'contact.pipelineDetails.pipeline.id': { $in: [ObjectId(parseData(groupFilter.pipeline))] },
                ...(groupFilter.pipelineStage
                  ? groupFilter.pipelineStage === 'UnassignedItem'
                    ? { 'contact.pipelineDetails.status': null }
                    : {
                        'contact.pipelineDetails.status.id': { $in: [ObjectId(parseData(groupFilter.pipelineStage))] }
                      }
                  : {})
              }
          : {})
      }
    },
    {
      $lookup: {
        from: 'snoozedusertasks',
        let: {
          taskId: '$_id'
        },
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId)
                }
              ]
            }
          }
        ],
        as: 'snoozeDetail'
      }
    },
    {
      $unwind: {
        path: '$snoozeDetail',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: { ...snoozeDetailMatch }
    },
    {
      $facet: {
        totalTasks: [
          {
            $count: 'total'
          }
        ],
        tasks: [
          {
            $lookup: {
              from: 'tasknotifyusers',
              let: {
                taskId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    $and: [
                      {
                        $expr: { $eq: ['$$taskId', '$task'] }
                      },
                      {
                        user: new ObjectId(currentUserId),
                        notificationFor: 'new-update',
                        deleted: false
                      }
                    ]
                  }
                }
              ],
              as: 'isUnreadUpdates'
            }
          },
          {
            $project: {
              latestUpdates: 1,
              sub_tasks: 1,
              // isUnreadUpdates : 1,
              isUnreadUpdates: {
                $cond: {
                  if: {
                    $size: ['$isUnreadUpdates']
                  },
                  then: true,
                  else: false
                }
              },
              // assigned: 1,
              createdAt: 1,
              order: 1,
              snoozeDetail: 1,
              priorityObj: 1,
              statusObj: 1,
              // categoryObj: 1,
              taskNumber: 1,
              assigneeName: { $arrayElemAt: ['$assigned.firstName', 0] },
              pinned: { $arrayElemAt: ['$pinnedusertasks.pinned', 0] },
              ...project,
              contact: { firstName: 1, lastName: 1, email: 1, userProfile: 1, company_name: 1, company: 1, _id: 1 }
            }
          },
          {
            $sort: {
              pinned: -1,
              ...$sort
            }
          },
          { $skip: skip },
          { $limit: limit }
        ]
      }
    },
    {
      $unwind: {
        path: '$totalTasks',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        totalTasks: '$totalTasks.total',
        tasks: '$tasks'
      }
    }
  ])
}

const findAllTasksWithAggregateForKanbanView = ({
  match,
  skip,
  limit,
  project,
  extraParams,
  sort,
  groupFilter,
  currentUserId,
  snoozeDetailMatch = {},
  currentView = 'category',
  page
}) => {
  const taskKanbanViewOrder = {
    category: 'kanbanCategoryOrder',
    status: 'kanbanStatusOrder',
    priority: 'kanbanPriorityOrder'
  }
  let $sort = {}

  if (currentView && taskKanbanViewOrder[currentView]) {
    $sort = {
      [taskKanbanViewOrder[currentView]]: 1
    }
  }
  console.log('$sort : ', $sort)

  // if (sort?.column && sort?.order) {
  //   if (sort.column === 'priority') {
  //     $sort = {
  //       'priorityObj.order': sort?.order,
  //       ...(sort?.order === 1 ? { 'priorityObj.createdAt': -1 } : { 'priorityObj.createdAt': 1 })
  //     }
  //   } else if (sort.column === 'status') {
  //     $sort = {
  //       'statusObj.order': sort?.order,
  //       ...(sort?.order === 1 ? { 'statusObj.createdAt': -1 } : { 'statusObj.createdAt': 1 })
  //     }
  //   } else if (sort.column === 'contact') {
  //     $sort = { 'contact.firstName': sort?.order }
  //   } else if (sort.column === 'assigned') {
  //     $sort = { assigneeName: sort?.order }
  //   } else {
  //     $sort = { [sort?.column]: sort?.order }
  //   }
  // } else {
  //   $sort = { pinned: -1, order: 1, createdAt: -1 }
  // }

  // $sort = { 'snoozeDetail.snoozeUntil': 1, ...$sort }

  const groupByFields =
    currentView === 'category' ? '$category._id' : currentView === 'status' ? '$status._id' : '$priority._id'
  return Tasks.aggregate([
    ...(extraParams
      ? [
          {
            $lookup: {
              from: 'tasks',
              localField: '_id',
              foreignField: 'parent_task',
              pipeline: [
                {
                  $match: {
                    trash: false,
                    ...extraParams.subTaskFilter,
                    company: match.company
                  }
                },
                {
                  $lookup: {
                    from: 'snoozedusertasks',
                    let: {
                      taskId: '$_id'
                    },
                    pipeline: [
                      {
                        $match: {
                          $and: [
                            {
                              $expr: { $eq: ['$$taskId', '$task'] }
                            },
                            {
                              user: new ObjectId(currentUserId)
                            }
                          ]
                        }
                      }
                    ],
                    as: 'snoozeDetail'
                  }
                },
                {
                  $unwind: {
                    path: '$snoozeDetail',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $match: { ...snoozeDetailMatch }
                },
                {
                  $project: {
                    status: 1,
                    priority: 1,
                    category: 1,
                    contact: 1,
                    assigned: 1,
                    frequency: 1,
                    name: 1,
                    taskNumber: 1,
                    completed: 1,
                    trash: 1,
                    snoozeDetail: 1
                  }
                }
              ],
              as: 'sub_tasks'
            }
          }
        ]
      : []),
    {
      $addFields: {
        sub_tasks: {
          $slice: ['$sub_tasks', 0, 5]
        },
        totalSubTasks: {
          $size: '$sub_tasks'
        }
      }
    },
    {
      $match: { ...match }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assigned',
        foreignField: '_id',
        pipeline: [
          {
            $project: { userProfile: 1, firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'assigned'
      }
    },
    {
      $lookup: {
        from: 'pinnedusertasks',
        localField: '_id',
        foreignField: 'taskId',
        pipeline: [
          {
            $match: {
              userId: ObjectId(currentUserId)
            }
          },
          {
            $project: { pinned: 1 }
          }
        ],
        as: 'pinnedusertasks'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'priority',
        foreignField: '_id',
        pipeline: [
          {
            $project: { label: 1, order: 1, createdAt: 1, color: 1 }
          }
        ],
        as: 'priority'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'status',
        foreignField: '_id',
        pipeline: [
          {
            $project: { label: 1, order: 1, createdAt: 1, color: 1 }
          }
        ],
        as: 'status'
      }
    },
    {
      $lookup: {
        from: 'taskoptions',
        localField: 'category',
        foreignField: '_id',
        pipeline: [
          {
            $project: { label: 1, order: 1, createdAt: 1, color: 1 }
          }
        ],
        as: 'category'
      }
    },
    {
      $unwind: {
        path: '$priority',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: '$status',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: '$category',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        pipeline: [
          {
            $project: { firstName: 1, lastName: 1, email: 1 }
          }
        ],
        as: 'createdBy'
      }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'contact',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              userProfile: 1,
              company_name: 1,
              company: 1,
              group: 1,
              status: 1,
              category: 1,
              tags: 1,
              pipelineDetails: 1
            }
          }
        ],

        as: 'contact'
      }
    },
    {
      $lookup: {
        from: 'taskupdates',
        localField: '_id',
        foreignField: 'task',
        as: 'updates',
        pipeline: [
          {
            $match: {
              deleted: false
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              pipeline: [
                {
                  $project: { firstName: 1, lastName: 1, email: 1 }
                }
              ],
              as: 'createdBy'
            }
          },
          {
            $project: { content: 1, createdAt: 1, createdBy: { $arrayElemAt: ['$createdBy', 0] } }
          }
        ]
      }
    },
    {
      $addFields: {
        latestUpdates: { $arrayElemAt: ['$updates', -1] }
      }
    },
    {
      $match: {
        ...(groupFilter.group
          ? groupFilter.group === 'Unassigned'
            ? { 'contact.group': null }
            : {
                'contact.group.id': ObjectId(parseData(groupFilter.group))
              }
          : {}),

        ...(groupFilter.groupStatus
          ? groupFilter.groupStatus === 'UnassignedItem'
            ? { 'contact.status': null }
            : {
                'contact.status.id': ObjectId(parseData(groupFilter.groupStatus))
              }
          : {}),

        ...(groupFilter.groupCategory
          ? groupFilter.groupCategory === 'UnassignedItem'
            ? { 'contact.category': null }
            : {
                'contact.category.id': ObjectId(parseData(groupFilter.groupCategory))
              }
          : {}),

        ...(groupFilter.tags?.length
          ? groupFilter.tags?.includes('UnassignedItem')
            ? { 'contact.tags': [] }
            : {
                'contact.tags': { $in: [...parseData(groupFilter.tags)?.map((tag) => ObjectId(tag))] }
              }
          : {}),

        ...(groupFilter.pipeline
          ? groupFilter.pipeline === 'UnassignedItem'
            ? { 'contact.pipelineDetails': [] }
            : {
                'contact.pipelineDetails.pipeline.id': { $in: [ObjectId(parseData(groupFilter.pipeline))] },
                ...(groupFilter.pipelineStage
                  ? groupFilter.pipelineStage === 'UnassignedItem'
                    ? { 'contact.pipelineDetails.status': null }
                    : {
                        'contact.pipelineDetails.status.id': { $in: [ObjectId(parseData(groupFilter.pipelineStage))] }
                      }
                  : {})
              }
          : {})
      }
    },
    {
      $lookup: {
        from: 'snoozedusertasks',
        let: {
          taskId: '$_id'
        },
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId)
                }
              ]
            }
          }
        ],
        as: 'snoozeDetail'
      }
    },
    {
      $unwind: {
        path: '$snoozeDetail',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: { ...snoozeDetailMatch }
    },
    {
      $lookup: {
        from: 'tasknotifyusers',
        let: {
          taskId: '$_id'
        },
        // localField: '_id',
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$$taskId', '$task'] }
                },
                {
                  user: new ObjectId(currentUserId),
                  notificationFor: 'new-update',
                  deleted: false
                }
              ]
            }
          }
        ],
        as: 'isUnreadUpdates'
      }
    },
    {
      $unwind: {
        path: '$contact',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        latestUpdates: 1,
        sub_tasks: 1,
        // isUnreadUpdates : 1,
        isUnreadUpdates: {
          $cond: {
            if: {
              $size: ['$isUnreadUpdates']
            },
            then: true,
            else: false
          }
        },
        // assigned: 1,
        createdAt: 1,
        order: 1,
        kanbanCategoryOrder: 1,
        kanbanPriorityOrder: 1,
        kanbanStatusOrder: 1,
        totalSubTasks: 1,
        snoozeDetail: 1,
        priority: 1,
        status: 1,
        category: 1,
        taskNumber: 1,
        assigneeName: { $arrayElemAt: ['$assigned.firstName', 0] },
        pinned: { $arrayElemAt: ['$pinnedusertasks.pinned', 0] },
        ...project,
        name: 1,
        details: 1,
        startDate: 1,
        endDate: 1,
        parent_task: 1,
        trash: 1,
        completed: 1,
        completedAt: 1,
        assigned: 1,
        snoozeUntil: 1,
        hideSnoozeTask: 1,
        contact: { firstName: 1, lastName: 1, email: 1, userProfile: 1, company_name: 1, company: 1, _id: 1 }
      }
    },
    {
      $sort: {
        ...$sort
        // pinned: -1
      }
    },
    {
      $group: {
        _id: groupByFields,
        tasks: {
          $push: '$$ROOT'
        },
        total: {
          $sum: 1
        }
      }
    },
    {
      $addFields: {
        tasks: {
          $slice: ['$tasks', skip, limit]
        },
        hasMoreContacts: {
          $cond: {
            if: {
              $gt: ['$total', page * 10]
            },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        [currentView]: '$_id',
        tasks: '$tasks',
        hasMoreContacts: '$hasMoreContacts',
        totalCount: '$total',
        _id: 0
      }
    }
  ])
  // [
  //   {
  //     $group:
  //       /**
  //        * _id: The id of the group.
  //        * fieldN: The first field name.
  //        */
  //       {
  //         _id: "$category",
  //         tasks: {
  //           $push: "$$ROOT",
  //         },
  //         total: {
  //           $sum: 1,
  //         },
  //       },
  //   },
  //   {
  //     $match:
  //       /**
  //        * query: The query in MQL.
  //        */
  //       {
  //         _id: null,
  //       },
  //   },
  // {
  //   $addFields:
  //     /**
  //      * newField: The new field name.
  //      * expression: The new field expression.
  //      */
  //     {
  //       tasks: {
  //         $slice: ["$tasks", (1 - 1) * 10, 10],
  //       },
  //       hasMoreContacts: {
  //         $cond: {
  //           if: {
  //             $gt: ["$total", 67 * 10],
  //           },
  //           then: true,
  //           // SET IT TO "TRUE"
  //           else: false,
  //         },
  //       },
  //     },
  // },
  // ]
}

export {
  createTasks,
  findOneTask,
  findAllTasks,
  findAllTasksWithAggregateCount,
  findAllTasksWithAggregate,
  findAllTasksWithTotalTask,
  updateTasks,
  updateTask,
  deleteTasks,
  findTotalTasks,
  findAllTasksWithAggregateById,
  findAllTasksWithAggregateWithoutLimit,
  findLastTask,
  findTaskWithDeleted,
  updateOneTaskWithDeleted,
  findAllTasksWithAggregateForExport,
  findOneTaskDetail,
  findTasksOptionCount,
  findAllSnoozedTasksCounts,
  findAllTasksWithAggregateForKanbanView
}
