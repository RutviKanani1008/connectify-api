import { TaskTimer } from '../models/taskTimer'
import { ObjectId } from 'mongodb'

const findTaskTimer = (params) => {
  return TaskTimer.findOne(params)
}

const findAllTaskTimer = (params, projection = {}, populate, sort = { createdAt: -1 }) => {
  return TaskTimer.find(params, projection).populate(populate).sort(sort)
}

const createTaskTimer = (data) => {
  return TaskTimer.create(data)
}

const getTotalTimeByTask = (match) => {
  return TaskTimer.aggregate([
    {
      $match: {
        ...match
      }
    },
    {
      $group: {
        _id: null,
        totalDuration: {
          $sum: '$totalTime'
        }
      }
    }
  ])
}

const updateTaskTimer = (search, updateValue) => {
  return TaskTimer.updateOne(search, updateValue)
}

const getLastTaskTimer = (params, projection = {}) => {
  return TaskTimer.findOne(params, projection).sort({ _id: -1 })
}

const deleteTaskTimer = (params) => {
  return TaskTimer.delete(params)
}

const getAdminTaskTimer = (match = {}) => {
  return TaskTimer.aggregate([
    {
      $match: {
        ...match
      }
    },
    {
      $lookup: {
        from: 'tasks',
        let: {
          task_id: '$task'
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$task_id']
              }
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              taskNumber: 1,
              warningDisabledUsers: 1
            }
          }
        ],
        as: 'task'
      }
    },
    {
      $unwind: {
        path: '$task',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'users',
        let: {
          startedBy: '$startedBy'
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$startedBy']
              }
            }
          },
          {
            $project: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1
            }
          }
        ],
        as: 'startedBy'
      }
    },
    {
      $unwind: {
        path: '$startedBy',
        preserveNullAndEmptyArrays: true
      }
    }
  ])
}

const getCurrentStartedTasks = (match = {}, currentUser) => {
  return TaskTimer.aggregate([
    {
      $match: {
        ...match
      }
    },
    {
      $lookup: {
        from: 'tasks',
        let: {
          task_id: '$task'
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$task_id']
              }
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              taskNumber: 1
            }
          }
        ],
        as: 'task'
      }
    },
    {
      $unwind: {
        path: '$task',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'users',
        let: {
          startedBy: '$startedBy'
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$startedBy']
              }
            }
          },
          {
            $project: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1
            }
          }
        ],
        as: 'startedBy'
      }
    },
    {
      $unwind: {
        path: '$startedBy',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        'task.startedBy': new ObjectId(currentUser)
      }
    }
  ])
}

const findTaskTimerReport = (match) => {
  return TaskTimer.aggregate([
    {
      $lookup: {
        from: 'tasks',
        localField: 'task',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              // startDate: 1,
              company: 1,
              // endDate: 1,
              contact: 1,
              name: 1,
              taskNumber: 1
            }
          }
        ],
        as: 'task'
      }
    },
    {
      $unwind: {
        path: '$task',
        includeArrayIndex: 'string',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        ...match
      }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'task.contact',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              company_name: 1
            }
          }
        ],
        as: 'task.contact'
      }
    },
    {
      $unwind: {
        path: '$task.contact',
        preserveNullAndEmptyArrays: true
      }
    }
  ])
}

const findTaskTimerChart = (match) => {
  return TaskTimer.aggregate([
    {
      $lookup: {
        from: 'tasks',
        localField: 'task',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              company: 1,
              contact: 1,
              name: 1,
              taskNumber: 1
            }
          }
        ],
        as: 'task'
      }
    },
    {
      $unwind: {
        path: '$task',
        includeArrayIndex: 'string',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        ...match
      }
    },
    {
      $project: {
        task: 1,
        totalDuration: 1
      }
    }
  ])
}

export {
  createTaskTimer,
  findTaskTimer,
  findAllTaskTimer,
  updateTaskTimer,
  deleteTaskTimer,
  getLastTaskTimer,
  getTotalTimeByTask,
  getAdminTaskTimer,
  getCurrentStartedTasks,
  findTaskTimerReport,
  findTaskTimerChart
}
