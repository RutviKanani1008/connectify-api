import { AVAILABLE_EVENT_TYPE, ContactActivity } from '../models/contact-activity'

const findContactActivity = (params) => {
  return ContactActivity.findOne(params)
}

const findAllContactActivity = (params) => {
  return ContactActivity.find(params).sort({ createdAt: -1 })
}

const createMultipleContactActivity = (data, populate = []) => {
  return ContactActivity.insertMany(data, { populate })
}

const createContactActivity = (data) => {
  return ContactActivity.create(data)
}

const updateContactActivity = (search, updateValue) => {
  return ContactActivity.updateOne(search, updateValue)
}

const deleteContactActivity = (params) => {
  return ContactActivity.delete(params)
}

const getAllContactActivitiesWithPopulate = (match, skip, limit) => {
  return ContactActivity.aggregate([
    [
      {
        $facet: {
          notes: [
            {
              $match: {
                eventFor: 'note',
                ...match
              }
            },
            {
              $lookup: {
                from: 'notes',
                localField: 'refId',
                foreignField: '_id',
                as: 'noteDetail'
              }
            },
            {
              $unwind: {
                path: '$noteDetail',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                eventType: 1,
                contact: 1,
                eventFor: 1,
                refId: 1,
                company: 1,
                createdBy: 1,
                createdAt: 1,
                updatedAt: 1,
                'noteDetail.title': 1,
                'noteDetail.note': 1,
                'noteDetail._id': 1,
                'noteDetail.modelName': 1
              }
            }
          ],
          tasks: [
            {
              $match: {
                eventFor: 'task',
                ...match
              }
            },
            {
              $lookup: {
                from: 'tasks',
                localField: 'refId',
                foreignField: '_id',
                as: 'taskDetail'
              }
            },
            {
              $unwind: {
                path: '$taskDetail',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                eventType: 1,
                contact: 1,
                eventFor: 1,
                refId: 1,
                company: 1,
                createdBy: 1,
                createdAt: 1,
                updatedAt: 1,
                'taskDetail.taskNumber': 1,
                'taskDetail.name': 1,
                'taskDetail._id': 1
              }
            }
          ],
          taskUpdate: [
            {
              $match: {
                eventFor: 'taskUpdate',
                ...match
              }
            },
            {
              $lookup: {
                from: 'taskupdates',
                localField: 'refId',
                foreignField: '_id',
                as: 'taskUpdates'
              }
            },
            {
              $unwind: {
                path: '$taskUpdates',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'tasks',
                let: { taskId: '$taskUpdates.task' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$taskId'] } } },
                  { $project: { _id: 1, taskNumber: 1, name: 1 } }
                ],
                as: 'taskUpdates.task'
              }
            },
            {
              $unwind: {
                path: '$taskUpdates.task',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                eventType: 1,
                contact: 1,
                eventFor: 1,
                refId: 1,
                company: 1,
                createdBy: 1,
                createdAt: 1,
                updatedAt: 1,
                'taskUpdates.content': 1,
                'taskUpdates.task': 1
              }
            }
          ],
          createContact: [
            {
              $match: {
                eventType: {
                  $in: [
                    AVAILABLE_EVENT_TYPE.NEW_CONTACT_CREATE_FROM_CONTACT_FORM,
                    AVAILABLE_EVENT_TYPE.NEW_CONTACT_CREATE_FROM_MASS_IMPORT,
                    AVAILABLE_EVENT_TYPE.NEW_CONTACT_CREATE_FROM_FILLING_MARKETING_FORM
                  ]
                },
                eventFor: 'contact',
                ...match
              }
            },
            {
              $lookup: {
                from: 'forms',
                let: { otherReferenceField: '$otherReferenceField' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$otherReferenceField'] } } },
                  { $project: { _id: 1, title: 1 } }
                ],
                as: 'otherReferenceField'
              }
            },
            {
              $unwind: {
                path: '$otherReferenceField',
                preserveNullAndEmptyArrays: true
              }
            }
          ]
        }
      },

      {
        $project: {
          activity: {
            $setUnion: ['$notes', '$tasks', '$taskUpdate', '$createContact']
          }
        }
      },
      {
        $unwind: {
          path: '$activity',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $replaceRoot: {
          newRoot: { $ifNull: ['$activity', {}] }
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { createdBy: '$createdBy' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$createdBy'] } } },
            { $project: { _id: 1, firstName: 1, lastName: 1, email: 1, phone: 1, relation: 1 } }
          ],
          as: 'createdBy'
        }
      },
      {
        $unwind: {
          path: '$createdBy',
          preserveNullAndEmptyArrays: true
          // preserveNullAndEmptyArrays: false
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]
  ])
}

const getAllContactActivitiesWithPopulateCount = (match) => {
  return ContactActivity.aggregate([
    [
      {
        $facet: {
          notes: [
            {
              $match: {
                eventFor: 'note',
                ...match
              }
            },
            {
              $lookup: {
                from: 'notes',
                localField: 'refId',
                foreignField: '_id',
                as: 'noteDetail'
              }
            },
            {
              $unwind: {
                path: '$noteDetail',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                eventType: 1,
                contact: 1,
                eventFor: 1,
                refId: 1,
                company: 1,
                createdBy: 1,
                createdAt: 1,
                updatedAt: 1,
                'noteDetail.title': 1,
                'noteDetail.note': 1,
                'noteDetail._id': 1,
                'noteDetail.modelName': 1
              }
            }
          ],
          tasks: [
            {
              $match: {
                eventFor: 'task',
                ...match
              }
            },
            {
              $lookup: {
                from: 'tasks',
                localField: 'refId',
                foreignField: '_id',
                as: 'taskDetail'
              }
            },
            {
              $unwind: {
                path: '$taskDetail',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                eventType: 1,
                contact: 1,
                eventFor: 1,
                refId: 1,
                company: 1,
                createdBy: 1,
                createdAt: 1,
                updatedAt: 1,
                'taskDetail.taskNumber': 1,
                'taskDetail.name': 1,
                'taskDetail._id': 1
              }
            }
          ],
          taskUpdate: [
            {
              $match: {
                eventFor: 'taskUpdate',
                ...match
              }
            },
            {
              $lookup: {
                from: 'taskupdates',
                localField: 'refId',
                foreignField: '_id',
                as: 'taskUpdates'
              }
            },
            {
              $unwind: {
                path: '$taskUpdates',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'tasks',
                let: { taskId: '$taskUpdates.task' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$taskId'] } } },
                  { $project: { _id: 1, taskNumber: 1, name: 1 } }
                ],
                as: 'taskUpdates.task'
              }
            },
            {
              $unwind: {
                path: '$taskUpdates.task',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                eventType: 1,
                contact: 1,
                eventFor: 1,
                refId: 1,
                company: 1,
                createdBy: 1,
                createdAt: 1,
                updatedAt: 1,
                'taskUpdates.content': 1,
                'taskUpdates.task': 1
              }
            }
          ],
          createContact: [
            {
              $match: {
                eventType: {
                  $in: [
                    AVAILABLE_EVENT_TYPE.NEW_CONTACT_CREATE_FROM_CONTACT_FORM,
                    AVAILABLE_EVENT_TYPE.NEW_CONTACT_CREATE_FROM_MASS_IMPORT,
                    AVAILABLE_EVENT_TYPE.NEW_CONTACT_CREATE_FROM_FILLING_MARKETING_FORM
                  ]
                },
                eventFor: 'contact',
                ...match
              }
            },
            {
              $lookup: {
                from: 'forms',
                let: { otherReferenceField: '$otherReferenceField' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$otherReferenceField'] } } },
                  { $project: { _id: 1, title: 1 } }
                ],
                as: 'otherReferenceField'
              }
            },
            {
              $unwind: {
                path: '$otherReferenceField',
                preserveNullAndEmptyArrays: true
              }
            }
          ]
        }
      },
      {
        $project: {
          activity: {
            $setUnion: ['$notes', '$tasks', '$taskUpdate', '$createContact']
          }
        }
      },
      {
        $unwind: {
          path: '$activity',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $replaceRoot: {
          newRoot: { $ifNull: ['$activity', {}] }
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { createdBy: '$createdBy' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$createdBy'] } } },
            { $project: { _id: 1, firstName: 1, lastName: 1, email: 1, phone: 1, relation: 1 } }
          ],
          as: 'createdBy'
        }
      },
      {
        $unwind: {
          path: '$createdBy',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $count: 'totalActivity'
      }
    ]
  ])
}

export {
  createContactActivity,
  findContactActivity,
  findAllContactActivity,
  updateContactActivity,
  deleteContactActivity,
  createMultipleContactActivity,
  getAllContactActivitiesWithPopulate,
  getAllContactActivitiesWithPopulateCount
}
