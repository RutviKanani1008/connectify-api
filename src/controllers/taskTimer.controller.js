/* eslint-disable no-unused-vars */
import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import { findOneTaskDetail, findOneTask } from '../repositories/task.repository'
import {
  createTaskTimer,
  deleteTaskTimer,
  findAllTaskTimer,
  findTaskTimer,
  findTaskTimerReport,
  getAdminTaskTimer,
  getLastTaskTimer,
  getTotalTimeByTask,
  updateTaskTimer
} from '../repositories/taskTimer.repository'
import { TASK_TIMER_STATUS } from '../models/tasks'
import path from 'path'
import excelJS from 'exceljs'
import taskTimerColumnData from '../mapper/exportData/taskTimer'
import moment from 'moment'
import _ from 'lodash'
import { TaskTimer } from '../models/taskTimer'
import { customParse, getSelectParams } from '../helpers/generalHelper'

const getMappedColumns = (model) => {
  switch (model) {
    case 'taskTimer':
      return taskTimerColumnData
  }
}
export const getTaskTimerDetails = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { task } = req.query
    if (!task) {
      return generalResponse(res, false, { text: 'Task Id is required.' }, 'error', false, 400)
    }

    const taskTimer = await getLastTaskTimer({
      task: ObjectId(task),
      company: Object(currentUser.company)
    })

    TaskTimer.populate(taskTimer, [
      { path: 'startedBy', select: { firstName: 1, lastName: 1, email: 1 } },
      { path: 'task', select: { _id: 1, name: 1, taskNumber: 1 } }
    ]).then(async (taskTimerDetail) => {
      let taskTimerDuration = 0
      if (taskTimerDetail) {
        taskTimerDuration = await getTotalTimeByTask({ task: ObjectId(task) })
        taskTimerDetail._doc.totalTaskDuration = taskTimerDuration?.[0]?.totalDuration
      }
      return generalResponse(res, taskTimer, 'success')
    })
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getLatestTaskTimerDetails = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    if (currentUser?.role === 'admin') {
      const timers = await getAdminTaskTimer({
        company: ObjectId(currentUser.company),
        currentStatus: { $in: [TASK_TIMER_STATUS.pause, TASK_TIMER_STATUS.start] }
      })
      return generalResponse(res, timers, 'success')
    } else if (
      currentUser?.role === 'user' &&
      _.isArray(currentUser.permissions) &&
      currentUser.permissions.includes('task-manager')
    ) {
      const taskUsers = currentUser.taskManagerUsers
      const assignedUsers = [ObjectId(currentUser._id)]

      if (taskUsers && taskUsers.length) {
        assignedUsers.push(...taskUsers.map((uId) => ObjectId(uId)))
      }
      const timers = await TaskTimer.aggregate([
        {
          $match: {
            company: ObjectId(currentUser.company),
            currentStatus: { $in: [TASK_TIMER_STATUS.pause, TASK_TIMER_STATUS.start] }
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
                  assigned: 1,
                  createdBy: 1
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
          $match: {
            $or: [{ 'task.createdBy': ObjectId(currentUser._id) }, { 'task.assigned': { $in: assignedUsers } }]
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
      console.log({ timers })
      return generalResponse(res, timers, 'success')
    } else {
      return generalResponse(res, [], 'success')
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getAllTimerDetails = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { task, sort } = req.query
    if (!task) {
      return generalResponse(res, false, { text: 'Task Id is required.' }, 'error', false, 400)
    }

    const taskTimer = await findAllTaskTimer(
      {
        task: ObjectId(task),
        company: ObjectId(currentUser.company)
      },
      getSelectParams(req),
      // undefined,
      [
        { path: 'startedBy', ref: 'Users', select: { firstName: 1, lastName: 1, email: 1 } },
        { path: 'endedBy', ref: 'Users', select: { firstName: 1, lastName: 1, email: 1 } },
        { path: 'pauses.pausedBy', ref: 'Users', select: { firstName: 1, lastName: 1, email: 1 } },
        { path: 'pauses.resumedBy', ref: 'Users', select: { firstName: 1, lastName: 1, email: 1 } }
      ],
      customParse(sort)
    )

    let taskTimerDuration = 0
    if (taskTimer) {
      taskTimerDuration = await getTotalTimeByTask({ task: ObjectId(task), company: ObjectId(currentUser.company) })
      // taskTimer._doc.totalTaskDuration = taskTimerDuration?.[0]?.totalDuration
      console.log({ taskTimerDuration })
    }
    // console.log(taskTimer)
    return generalResponse(res, { taskTimer, taskTimerDuration: taskTimerDuration?.[0]?.totalDuration }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const createTaskTimerDetails = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { task, startTime } = req.body
    if (!task) {
      return generalResponse(res, false, { text: 'Task Id is required.' }, 'error', false, 400)
    }
    const taskDetails = await findOneTaskDetail({ _id: ObjectId(task) }, { _id: 1 })
    if (taskDetails) {
      const isTimer = await getAdminTaskTimer({
        company: ObjectId(currentUser.company),
        currentStatus: TASK_TIMER_STATUS.start,
        startedBy: ObjectId(currentUser._id)
      })
      if (isTimer.length) {
        return generalResponse(res, isTimer, { text: 'Task already in start.' }, 'error', false, 400)
      } else {
        const taskTimer = await createTaskTimer({
          task: taskDetails._id,
          startedAt: startTime,
          startedBy: currentUser?._id,
          endedBy: null,
          pauses: [],
          currentStatus: TASK_TIMER_STATUS.start,
          company: currentUser?.company
        })
        TaskTimer.populate(taskTimer, [
          { path: 'startedBy', select: { firstName: 1, lastName: 1, email: 1 } },
          { path: 'task', select: { _id: 1, name: 1, taskNumber: 1 } }
        ]).then(async (taskTimerDetail) => {
          let taskTimerDuration = 0
          if (taskTimerDetail) {
            taskTimerDuration = await getTotalTimeByTask({ task: ObjectId(taskDetails._id) })
            taskTimerDetail._doc.totalTaskDuration = taskTimerDuration?.[0]?.totalDuration
          }
          return generalResponse(res, taskTimer, 'success')
        })
      }
    } else {
      return generalResponse(res, false, { text: 'Task not fount.' }, 'error', false, 400)
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateTaskTimerDetails = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { id: timerId } = req.params
    const { task, startTime, endTime, current_status, pausedTime, pausedId, note } = req.body
    if (!task) {
      return generalResponse(res, false, { text: 'Task Id is required.' }, 'error', false, 400)
    }
    if (!timerId) {
      return generalResponse(res, false, { text: 'TImer Id is required.' }, 'error', false, 400)
    }
    const taskTimer = await findTaskTimer({
      _id: ObjectId(timerId)
    })

    if (!taskTimer) {
      return generalResponse(res, false, { text: 'Task timer not found.' }, 'error', false, 400)
    } else {
      if (current_status === TASK_TIMER_STATUS.start) {
        const isTimer = await getAdminTaskTimer({
          company: ObjectId(currentUser.company),
          currentStatus: TASK_TIMER_STATUS.start,
          startedBy: ObjectId(currentUser._id)
        })
        if (isTimer.length) {
          return generalResponse(res, isTimer, { text: 'Task already in start.' }, 'error', false, 400)
        }
      }

      if (
        endTime &&
        current_status === TASK_TIMER_STATUS.end &&
        (taskTimer.currentStatus === TASK_TIMER_STATUS.start || taskTimer.currentStatus === TASK_TIMER_STATUS.pause)
      ) {
        let totalPausedTime = 0
        if (taskTimer.pauses?.length > 0 && taskTimer.currentStatus === TASK_TIMER_STATUS.pause) {
          let isUpdated = false
          if (pausedId && ObjectId.isValid(pausedId)) {
            taskTimer.pauses.forEach((timer) => {
              if (timer._id.equals(ObjectId(pausedId)) && !timer.resumedAt) {
                timer.resumedAt = endTime
                timer.resumedBy = currentUser?._id
                timer.totalPausedTime = Number(endTime) - Number(timer.pausedAt)
                isUpdated = true
              }
            })
          }
          if (!isUpdated) {
            taskTimer.pauses.forEach((timer) => {
              if (!timer.resumedAt) {
                timer.resumedAt = endTime
                timer.resumedBy = currentUser?._id
                timer.totalPausedTime = Number(endTime) - Number(timer.pausedAt)
                isUpdated = true
              }
            })
          }
        }
        if (taskTimer.pauses.length) {
          totalPausedTime = taskTimer.pauses.map((obj) => obj.totalPausedTime).reduce((acc, val) => acc + val, 0)
        }
        taskTimer.totalTime = Number(endTime) - Number(taskTimer.startedAt) - Number(totalPausedTime)
        taskTimer.endedAt = endTime
        taskTimer.note = note || null
        taskTimer.endedBy = currentUser?._id
        taskTimer.currentStatus = TASK_TIMER_STATUS.end
      } else if (
        pausedTime &&
        current_status === TASK_TIMER_STATUS.pause &&
        taskTimer.currentStatus === TASK_TIMER_STATUS.start
      ) {
        const pausedObj = {
          pausedAt: pausedTime,
          pausedBy: currentUser?._id
        }
        if (!taskTimer.pauses?.length) {
          taskTimer.pauses = []
        }
        taskTimer.currentStatus = TASK_TIMER_STATUS.pause
        taskTimer.pauses.push(pausedObj)
      } else if (
        startTime &&
        pausedId &&
        current_status === TASK_TIMER_STATUS.start &&
        taskTimer.currentStatus === TASK_TIMER_STATUS.pause
      ) {
        taskTimer.pauses.forEach((timer) => {
          if (timer._id.equals(ObjectId(pausedId)) && !timer.resumedAt) {
            timer.resumedAt = startTime
            timer.resumedBy = currentUser?._id
            timer.totalPausedTime = Number(startTime) - Number(timer.pausedAt)
          }
        })
        taskTimer.currentStatus = TASK_TIMER_STATUS.start
      }
      await updateTaskTimer({ _id: ObjectId(timerId) }, taskTimer)

      if (taskTimer) {
        TaskTimer.populate(taskTimer, [
          { path: 'startedBy', select: { firstName: 1, lastName: 1, email: 1 } },
          { path: 'endedBy', select: { firstName: 1, lastName: 1, email: 1 } },
          { path: 'task', select: { _id: 1, name: 1, taskNumber: 1 } }
        ]).then(async (taskTimerDetail) => {
          let taskTimerDuration = 0
          if (taskTimerDetail) {
            taskTimerDuration = await getTotalTimeByTask({ task: ObjectId(task) })
            taskTimerDetail._doc.totalTaskDuration = taskTimerDuration?.[0]?.totalDuration
          }
          return generalResponse(res, taskTimerDetail, 'success')
        })
      }
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteTaskTimerDetails = async (req, res) => {
  try {
    const timerId = req.params.id

    const status = await deleteTaskTimer({ _id: ObjectId(timerId) })

    if (status && status.acknowledged && status.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Invalid timerId.' }, 'error', false, 400)
    }

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getExportTaskTimerDetails = async (req, res) => {
  try {
    const { task, model, sort } = req.query
    const __dirname = path.resolve()
    const workbook = new excelJS.Workbook()
    const worksheet = workbook.addWorksheet(model)
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    if (!task) {
      return generalResponse(res, false, { text: 'Task Id is required.' }, 'error', false, 400)
    }

    let taskTimer = await findAllTaskTimer(
      {
        task: ObjectId(task),
        company: ObjectId(currentUser.company)
      },
      undefined,
      [
        { path: 'startedBy', ref: 'Users', select: { firstName: 1, lastName: 1, email: 1 } },
        { path: 'endedBy', ref: 'Users', select: { firstName: 1, lastName: 1, email: 1 } },
        { path: 'pauses.pausedBy', ref: 'Users', select: { firstName: 1, lastName: 1, email: 1 } },
        { path: 'pauses.resumedBy', ref: 'Users', select: { firstName: 1, lastName: 1, email: 1 } }
      ],
      customParse(sort)
    )
    taskTimer = taskTimer.map((obj) => ({
      startedAt: moment(moment.duration(Number(obj?.startedAt)).asMilliseconds()).format('MM/DD/yyyy hh:mm A'),
      endedAt: obj?.endedAt
        ? moment(moment.duration(Number(obj?.endedAt)).asMilliseconds()).format('MM/DD/yyyy hh:mm A')
        : 'Ongoing',
      startedBy: `${
        obj?.startedBy?.firstName || obj?.startedBy?.lastName
          ? `${obj?.startedBy?.firstName} ${obj?.startedBy?.lastName}`
          : ''
      }`,
      endedBy: `${
        obj?.endedBy?.firstName || obj?.endedBy?.lastName ? `${obj?.endedBy?.firstName} ${obj?.endedBy?.lastName}` : ''
      }`,
      totalDuration: moment.utc(moment.duration(Number(obj?.totalTime)).asMilliseconds()).format('HH:mm:ss')
    }))

    const taskDetail = await findOneTask({
      _id: ObjectId(task),
      company: ObjectId(currentUser.company)
    })

    const tempObj = {
      taskNumber: taskDetail?.taskNumber,
      task: taskDetail?.name,
      contact: taskDetail?.contact?.firstName || '' + ' ' + taskDetail?.contact?.lastName || '',
      company: taskDetail?.contact?.company_name
    }
    const columnHeaderData = {
      taskNumber: 'Task Number',
      task: 'Task',
      contact: 'Contact',
      company: 'Company Name'
    }
    worksheet.addRow(Object.values(columnHeaderData))
    worksheet.addRow(Object.values(tempObj))
    worksheet.addRow([])

    // set columns
    const columnData = getMappedColumns(model)
    worksheet.columns = Object.keys(columnData).map((key) => ({ header: columnData[key], key }))

    worksheet.spliceRows(1, 1, Object.values(columnHeaderData))
    worksheet.spliceRows(3, 1, [])
    worksheet.spliceRows(4, 1, Object.values(columnData))
    worksheet.getRow(4).eachCell((cell) => {
      cell.font = { bold: true }
    })
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true }
    })

    if (_.isArray(taskTimer)) {
      taskTimer.forEach((obj) => {
        worksheet.addRow({ ...obj })
      })
    }

    const filePath = `/files/task-timer-${Date.now()}.xlsx`
    await workbook.xlsx.writeFile(`${__dirname}/public${filePath}`)
    // return filePath
    return generalResponse(res, filePath, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const createTaskTimerHistory = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { task, startedAt, startedBy, endedAt, endedBy, totalTime, note } = req.body

    const taskDetails = await findOneTaskDetail({ _id: ObjectId(task) }, { _id: 1 })

    if (!taskDetails) {
      return generalResponse(res, false, { text: 'Task not found.' }, 'error', false, 400)
    }

    const taskTimer = await createTaskTimer({
      task: taskDetails._id,
      startedAt,
      startedBy,
      endedAt,
      endedBy,
      pauses: [],
      note: note || null,
      totalTime,
      currentStatus: TASK_TIMER_STATUS.end,
      company: currentUser?.company
    })
    TaskTimer.populate(taskTimer, [
      { path: 'startedBy', select: { firstName: 1, lastName: 1, email: 1 } },
      { path: 'endedBy', select: { firstName: 1, lastName: 1, email: 1 } },
      { path: 'task', select: { _id: 1, name: 1, taskNumber: 1 } }
    ]).then(async (taskTimerDetail) => {
      let taskTimerDuration = 0
      if (taskTimerDetail) {
        taskTimerDuration = await getTotalTimeByTask({ task: ObjectId(taskDetails._id) })
        taskTimerDetail._doc.totalTaskDuration = taskTimerDuration?.[0]?.totalDuration
      }
      return generalResponse(res, taskTimer, 'success')
    })
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateTaskTimerHistory = async (req, res) => {
  try {
    const timerId = req.params.id
    const { startedAt, startedBy, endedAt, endedBy, totalTime, note } = req.body

    const timerDetails = await findTaskTimer({ _id: ObjectId(timerId) })

    if (!timerDetails) {
      return generalResponse(res, false, { text: 'Timer history not found.' }, 'error', false, 400)
    }

    const prevTimer = {
      startedAt: timerDetails.startedAt,
      endedAt: timerDetails.endedAt,
      totalTime: timerDetails.totalTime
    }
    const newTimer = { startedAt, endedAt, totalTime }

    const isTimerSame = _.isEqual(prevTimer, newTimer)

    const taskTimer = await updateTaskTimer(
      { _id: ObjectId(timerId) },
      {
        startedAt,
        startedBy,
        endedAt,
        endedBy,
        pauses: isTimerSame ? timerDetails.pauses : [],
        note: note || null,
        totalTime
      }
    )

    const newTimerDetails = await findTaskTimer({ _id: ObjectId(timerId) })

    TaskTimer.populate(newTimerDetails, [
      { path: 'startedBy', select: { firstName: 1, lastName: 1, email: 1 } },
      { path: 'endedBy', select: { firstName: 1, lastName: 1, email: 1 } },
      { path: 'task', select: { _id: 1, name: 1, taskNumber: 1 } }
    ]).then(async (taskTimerDetail) => {
      let taskTimerDuration = 0
      if (taskTimerDetail) {
        taskTimerDuration = await getTotalTimeByTask({ task: ObjectId(taskTimer.task) })
        taskTimerDetail._doc.totalTaskDuration = taskTimerDuration?.[0]?.totalDuration
      }
      return generalResponse(res, newTimerDetails, 'success')
    })
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getTaskTimerReportDetail = async (req, res) => {
  try {
    const { startDate, endDate, contact = null, user = null } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    let match = {}

    if (startDate && moment(startDate).isValid() && endDate && moment(endDate).isValid()) {
      match = {
        $or: [
          {
            startedAt: { $gte: startDate },
            endedAt: { $lte: endDate }
          },
          {
            startedAt: { $lt: startDate },
            endedAt: { $gt: endDate }
          },
          {
            startedAt: { $lt: startDate },
            endedAt: null
          }
        ],
        company: ObjectId(currentUser.company),
        ...(contact && ObjectId.isValid(contact) && { 'task.contact': ObjectId(contact) })
      }

      if (user && ObjectId.isValid(user)) {
        match = {
          ...match,
          $and: [
            {
              $or: [...match.$or]
            },
            {
              $or: [
                {
                  startedBy: ObjectId(user)
                },
                {
                  endedBy: ObjectId(user)
                }
              ]
            }
          ]
        }
        delete match.$or
      }
    }
    const taskTimers = await findTaskTimerReport(match)
    return generalResponse(res, taskTimers, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
