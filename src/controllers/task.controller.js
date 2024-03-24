import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import {
  createTasks,
  deleteTasks,
  findAllTasks,
  findAllTasksWithAggregate,
  findOneTask,
  taskBulkWrite,
  findTotalTasks,
  updateTask,
  updateTasks,
  findAllTasksWithAggregateById,
  // findAllTasksWithAggregateCount,
  findAllTasksWithAggregateWithoutLimit,
  findLastTask,
  findTaskWithDeleted,
  updateOneTaskWithDeleted,
  findOneTaskDetail,
  findAllTasksWithAggregateForExport,
  findTasksOptionCount,
  findAllSnoozedTasksCounts,
  findAllTasksWithTotalTask,
  findAllTasksWithAggregateForKanbanView
} from '../repositories/task.repository'
import _ from 'lodash'
import { createDailyTaskObject, customParse, getGroupByData, getSelectParams } from '../helpers/generalHelper'
import { logger, parseData } from '../utils/utils'
import { sendMail } from '../services/send-grid'
import ejs from 'ejs'
import path from 'path'
import moment from 'moment'
import { findAllUser } from '../repositories/users.repository'
import { updateMultipleTaskOption, updateTaskOption } from '../repositories/taskOption.repository'
import { getSelectedContactsWithFilters } from '../repositories/contact.repository'
import { TASK_TIMER_STATUS, Tasks } from '../models/tasks'
import mongoose from 'mongoose'
import { findCompanyWithDeleted, findOneCompany, updateCompany } from '../repositories/companies.repository'
import { createTaskUpdates, deleteManyTaskUpdates, findAllTaskUpdates } from '../repositories/taskUpdate.repository'
import { createPinnedUserTask, deleteMuliplePinnedUserTask, deletePinnedUserTask } from '../repositories/pinnedUserTask'
import { createBulkTasksSchedulerJob } from '../schedular-jobs/bulk-tasks-create/createBulkTaskJobSchedulerQueue.helper'
import {
  createBulkTaskSnooze,
  deleteManySnoozedUserTask,
  deleteSnoozedUserTask,
  findSnoozedUserTask
} from '../repositories/snoozedUserTask'
import { AVAILABLE_ACTIVITY_FOR, AVAILABLE_EVENT_TYPE } from '../models/contact-activity'
import { createContactActivity, createMultipleContactActivity } from '../repositories/contactActivities'
import { updateEmails } from '../repositories/email.repository'
import {
  createAfterTaskInstructionTemplateRepo,
  findAfterTaskInstructionTemplateRepo
} from '../repositories/afterTaskInstructionTemplate.repository'
import { sendNotificationJob } from '../schedular-jobs/notification'
import { TASK_MANAGER_NOTIFICATION_ACTION, NOTIFICATION_MODULE_TYPE } from '../services/notification/constants'
import { deleteAttachmentFromWasabi } from '../middlewares/fileUploader'

export const addTaskDetail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    let { populate = [] } = req.query
    populate = customParse(populate)
    let tasks = req.body
    if (_.isArray(tasks)) {
      const lastTask = await findLastTask({
        params: { company: ObjectId(currentUser.company) },
        projection: { taskNumber: 1 }
      })
      const lastTaskNumber = !lastTask?.taskNumber ? 1000 : +lastTask.taskNumber + 1
      tasks = tasks.map((task, index) => ({
        ...task,
        kanbanCategoryOrder: 0,
        kanbanStatusOrder: 0,
        kanbanPriorityOrder: 0,
        company: ObjectId(currentUser.company),
        createdBy: currentUser._id,
        taskNumber: `${lastTaskNumber + index}`
      }))

      let newTasks = await createTasks(tasks, populate)

      // ***** AttachId into email if task created from email ****
      if (tasks?.[0]?.threadId && newTasks?.[0]?._id) {
        await updateEmails(
          { mail_provider_thread_id: tasks?.[0].threadId },
          {
            task: newTasks?.[0]?._id
          }
        )
      }

      if (newTasks.length) {
        for (const newTask of newTasks) {
          await sendNotificationJob({
            module: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
            data: {
              company: currentUser.company,
              taskId: newTask?._id,
              action: TASK_MANAGER_NOTIFICATION_ACTION.TASK_CREATION,
              createdBy: currentUser
            }
          })
        }
      }
      if (_.isArray(newTasks)) {
        newTasks = JSON.parse(JSON.stringify(newTasks))
        newTasks = newTasks.map((obj) => ({ ...obj, sub_tasks: 0 }))

        // create A contact activity
        const contactActivities = []
        newTasks.forEach((taskActivity) => {
          contactActivities.push({
            eventType: AVAILABLE_EVENT_TYPE.TASK_ASSIGNED,
            contact: taskActivity.contact?._id,
            eventFor: AVAILABLE_ACTIVITY_FOR.task,
            refId: ObjectId(taskActivity?._id),
            company: ObjectId(currentUser.company),
            createdBy: ObjectId(currentUser._id)
          })
        })
        if (contactActivities.length) {
          await createMultipleContactActivity(contactActivities)
        }
      }

      // Here check after task template is not exist then create new one
      for (const task of tasks) {
        if (task?.completedTaskInstruction) {
          const isExist = await findAfterTaskInstructionTemplateRepo({
            templateBody: task.completedTaskInstruction.trim()
          })
          if (!isExist) {
            await createAfterTaskInstructionTemplateRepo({
              company: ObjectId(currentUser.company),
              user: ObjectId(currentUser._id),
              templateBody: task.completedTaskInstruction
            })
          }
        }
      }

      for (const task of tasks) {
        const { removeAttachments = [] } = task
        if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
          await deleteAttachmentFromWasabi(removeAttachments)
        }
      }

      return generalResponse(res, newTasks, 'Task created successfully!', 'success', true)
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    console.log('Error:addTaskDetail', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addBulkTaskWithMultipleContact = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { contactFilters, taskData } = req.body

    const { is_all_selected, selected_contacts } = contactFilters || {}

    let contacts = selected_contacts || []
    if (is_all_selected) {
      const filters = { ...contactFilters, company: currentUser?.company, select: '_id' }
      const results = await getSelectedContactsWithFilters(filters)
      contacts = (results.contacts || []).map((c) => c._id)
    }

    let { populate = [] } = req.query
    populate = customParse(populate)

    if (_.isArray(taskData)) {
      await createBulkTasksSchedulerJob({
        contacts,
        taskData,
        currentUser,
        taskPopulate: populate
      })

      return generalResponse(res, null, 'Task created successfully!', 'success', true)
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getAllTasksList = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { role, _id, company } = currentUser

    let {
      limit = 20,
      page = 1,
      parent_task,
      search = '',
      includeSubTasks = 'true',
      priority,
      status,
      trash,
      assigned,
      category,
      frequency,
      contact,
      completed,
      open,
      sort,
      group,
      groupStatus,
      groupCategory,
      tags,
      pipeline,
      pipelineStage,
      snoozedTask = false
    } = req.query
    sort = parseData(sort)

    status = parseData(status)
    priority = parseData(priority)
    category = parseData(category)

    const isIncludeSubTasks = includeSubTasks === 'true'

    let subTaskFilter = {}

    let match = {}
    // for search

    if (search) {
      const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
      const reg = new RegExp(searchString, 'i')
      const tempSearch = {
        $or: [{ taskNumber: { $regex: reg } }, { name: { $regex: reg } }]
      }
      if (isIncludeSubTasks) {
        tempSearch.$or.push(...[{ 'sub_tasks.taskNumber': { $regex: reg } }, { 'sub_tasks.name': { $regex: reg } }])
      }

      match = { $and: [tempSearch] }
      if (isIncludeSubTasks) {
        const tempSubSearch = {
          $or: [{ taskNumber: { $regex: reg } }, { name: { $regex: reg } }]
        }
        subTaskFilter = { $and: [tempSubSearch] }
      }
    }
    if (parent_task === '') {
      match.parent_task = null
    }

    // user can only show created by & assigned
    if (role === 'user') {
      const taskUsers = currentUser.taskManagerUsers
      const assignedUsers = [ObjectId(_id)]

      if (taskUsers && taskUsers.length) {
        assignedUsers.push(...taskUsers.map((uId) => ObjectId(uId)))
      }

      const tempUser = {
        $or: [{ createdBy: ObjectId(_id) }, { assigned: { $in: assignedUsers } }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempUser] }
    }

    if (status || priority) {
      const $and = []

      if (_.isArray(priority)) {
        const $or = []
        $or.push({
          priority: {
            $in: priority.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
        if (isIncludeSubTasks) {
          $or.push({
            'sub_tasks.priority': {
              $in: priority.map((value) => {
                if (value === 'unassigned') {
                  return null
                }
                return ObjectId(value)
              })
            },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          })
        }
        $and.push({ $or })
      }
      if (_.isArray(status)) {
        const $or = []
        $or.push({
          status: {
            $in: status.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
        if (isIncludeSubTasks) {
          $or.push({
            'sub_tasks.status': {
              $in: status.map((value) => {
                if (value === 'unassigned') {
                  return null
                }
                return ObjectId(value)
              })
            },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          })
        }
        $and.push({ $or })
      }

      if (_.isArray(match.$and) && $and?.length) {
        match = { ...match, $and: [...match.$and, ...$and] || [] }
      } else {
        match = { ...match, $and }
      }

      if (isIncludeSubTasks) {
        subTaskFilter = { ...subTaskFilter, $and: [...(subTaskFilter?.$and || []), ...$and] }
      }
    }

    if (assigned) {
      const tempAssigned = {
        $or: [
          { assigned: ObjectId(assigned) },
          {
            'sub_tasks.assigned': ObjectId(assigned),
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { assigned: ObjectId(assigned) }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempAssigned] }
    }

    if (frequency) {
      const tempFrequency = {
        $or: [
          { frequency },
          {
            'sub_tasks.frequency': frequency,
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { frequency }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempFrequency] }
    }

    if (contact) {
      const tempContact = {
        $or: [
          { contact: ObjectId(contact) },
          {
            'sub_tasks.contact': ObjectId(contact),
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { contact: ObjectId(contact) }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempContact] }
    }

    if (category === null) {
      const tempcategory = {
        $or: [
          { category: { $eq: null } },
          {
            'sub_tasks.category': { $eq: null },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      match = { ...match, $and: [...(match?.$and || []), tempcategory] }
      if (isIncludeSubTasks) {
        subTaskFilter = {
          ...subTaskFilter,
          $and: [...(subTaskFilter?.$and || []), { category: { $eq: null } }]
        }
      }
    }

    if (category?.length) {
      const tempcategory = {
        $or: [
          { category: { $in: category?.map((value) => ObjectId(value)) } },
          {
            'sub_tasks.category': { $in: category?.map((value) => ObjectId(value)) },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      match = { ...match, $and: [...(match?.$and || []), tempcategory] }

      if (isIncludeSubTasks) {
        subTaskFilter = {
          ...subTaskFilter,
          $and: [...(subTaskFilter?.$and || []), { category: { $in: category?.map((value) => ObjectId(value)) } }]
        }
      }
    }

    if (completed || open) {
      match = {
        ...match,
        completed: completed === 'true'
      }
    }

    let snoozeTaskFilter = {}

    if (snoozedTask === 'false') {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        'snoozeDetail.hideSnoozeTask': { $ne: true }
      }
    }

    if (snoozedTask === 'true') {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        snoozeDetail: { $ne: null }
      }
    }

    match = {
      ...match,
      company: ObjectId(company),
      trash: trash === 'true'
    }

    // const totalTasks = await findAllTasksWithAggregateCount({
    //   match,
    //   extraParams: { subTaskFilter },
    //   snoozeDetailMatch: { ...snoozeTaskFilter },
    //   groupFilter: {
    //     group,
    //     groupStatus,
    //     groupCategory,
    //     tags,
    //     pipeline,
    //     pipelineStage
    //   },
    //   currentUserId: currentUser._id
    // })

    // let tasks = await findAllTasksWithAggregate({
    //   match,
    //   limit,
    //   skip: limit * (page || 1) - limit,
    //   project: { ...getSelectParams(req) },
    //   snoozeDetailMatch: { ...snoozeTaskFilter },
    //   groupFilter: {
    //     group,
    //     groupStatus,
    //     groupCategory,
    //     tags,
    //     pipeline,
    //     pipelineStage
    //   },
    //   extraParams: { subTaskFilter },
    //   sort,
    //   currentUserId: currentUser._id
    // })

    const taskDetails = await findAllTasksWithTotalTask({
      match,
      limit,
      skip: limit * (page || 1) - limit,
      project: { ...getSelectParams(req) },
      snoozeDetailMatch: { ...snoozeTaskFilter },
      groupFilter: {
        group,
        groupStatus,
        groupCategory,
        tags,
        pipeline,
        pipelineStage
      },
      extraParams: { subTaskFilter },
      sort,
      currentUserId: currentUser._id,
      snoozedTask
    })

    let { totalTasks = 0, tasks = [] } = taskDetails?.[0]

    // console.log({ totalTasks, tasks })
    tasks = tasks.map((obj) => ({
      ...obj,
      contact: obj?.contact?.[0] || null,
      assigned: obj?.assigned || null,
      createdBy: obj?.createdBy?.[0] || null,
      sub_tasks:
        obj?.sub_tasks?.filter((subTask) => (completed === 'true' ? subTask.completed : !subTask.completed))?.length ||
        0
    }))
    const snoozedTasks = await findAllSnoozedTasksCounts({
      match: { ...match, trash: false, completed: false },
      extraParams: { subTaskFilter },
      groupFilter: {
        group,
        groupStatus,
        groupCategory,
        tags,
        pipeline,
        pipelineStage
      },
      currentUserId: currentUser._id
    })
    return generalResponse(
      res,
      { tasks, pagination: { total: totalTasks }, totalSnoozeTasks: snoozedTasks[0]?.totalSnoozedTasks || 0 },
      'success'
    )
  } catch (error) {
    console.log({ error })
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getCalendarTaskList = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { role, _id, company } = currentUser

    let {
      limit = 100000,
      page = 1,
      search = '',
      priority,
      status,
      trash,
      assigned,
      category,
      frequency,
      contact,
      completed,
      open,
      sort,
      group,
      groupStatus,
      groupCategory,
      tags,
      pipeline,
      pipelineStage,
      snoozedTask = false,
      startDate,
      endDate
    } = req.query
    sort = parseData(sort)

    status = parseData(status)
    priority = parseData(priority)
    category = parseData(category)

    let match = {}
    // for search

    if (search) {
      const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
      const reg = new RegExp(searchString, 'i')

      const tempSearch = {
        $or: [{ taskNumber: { $regex: reg } }, { name: { $regex: reg } }]
      }

      match = { ...match, $and: [...(match?.$and || []), tempSearch] }
    }

    // user can only show created by & assigned
    if (role === 'user') {
      const taskUsers = currentUser.taskManagerUsers
      const assignedUsers = [ObjectId(_id)]

      if (taskUsers && taskUsers.length) {
        assignedUsers.push(...taskUsers.map((uId) => ObjectId(uId)))
      }

      const tempUser = {
        $or: [{ createdBy: ObjectId(_id) }, { assigned: { $in: assignedUsers } }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempUser] }
    }

    // ============================
    if (status || priority) {
      const $and = []

      if (_.isArray(priority)) {
        const $or = []
        $or.push({
          priority: {
            $in: priority.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
        $and.push({ $or })
      }
      if (_.isArray(status)) {
        const $or = []
        $or.push({
          status: {
            $in: status.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
        $and.push({ $or })
      }

      if (_.isArray(match.$and) && $and?.length) {
        // match = { ...match, $and: [...([...match?.$and, ...$and] || [])] }
        match = { ...match, $and: [...match.$and, ...$and] || [] }
      } else {
        match = { ...match, $and }
      }
    }
    // ============================

    if (assigned) {
      const tempAssigned = {
        assigned: ObjectId(assigned)
      }
      match = { ...match, $and: [...(match?.$and || []), tempAssigned] }
    }
    if (frequency) {
      const tempFrequency = {
        frequency
      }
      match = { ...match, $and: [...(match?.$and || []), tempFrequency] }
    }
    if (contact) {
      const tempContact = {
        contact: ObjectId(contact)
      }
      match = { ...match, $and: [...(match?.$and || []), tempContact] }
    }
    if (category === null) {
      const tempcategory = {
        category: { $eq: null }
      }
      match = { ...match, $and: [...(match?.$and || []), tempcategory] }
    }
    if (category?.length) {
      const tempcategory = {
        category: {
          // eslint-disable-next-line array-callback-return
          $in: category?.map((value) => {
            if (value === 'unassigned') {
              return null
            }
            if (ObjectId.isValid(value)) {
              return ObjectId(value)
            }
          })
        }
      }

      match = { ...match, $and: [...(match?.$and || []), tempcategory] }
    }

    if (completed || open) {
      match = {
        ...match,
        completed: completed === 'true'
      }
    }

    if (startDate && moment(startDate).isValid() && endDate && moment(endDate).isValid()) {
      match = {
        ...match,
        // $or: [
        //   {
        //     $and: [
        //       {
        //         startDate: { $lte: new Date(startDate) }
        //       },
        //       {
        //         endDate: { $gte: new Date(startDate) }
        //       }
        //     ]
        //   },
        //   {
        //     $and: [
        //       {
        //         startDate: { $lte: new Date(endDate) }
        //       },
        //       {
        //         endDate: { $gte: new Date(endDate) }
        //       }
        //     ]
        //   }
        // ]
        $or: [
          {
            $and: [
              {
                startDate: { $lte: new Date(startDate) },
                endDate: { $gte: new Date(endDate) }
              }
            ]
          },
          {
            startDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
          },
          {
            endDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
          }
        ]
      }
    }

    let snoozeTaskFilter = {}

    if (snoozedTask === 'false') {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        'snoozeDetail.hideSnoozeTask': { $ne: true }
      }
    }

    if (snoozedTask === 'true') {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        snoozeDetail: { $ne: null }
      }
    }

    match = {
      ...match,
      company: ObjectId(company),
      trash: trash === 'true'
    }

    // const totalTasks = await findAllTasksWithAggregateCount({
    //   match,
    //   extraParams: null,
    //   snoozeDetailMatch: { ...snoozeTaskFilter },
    //   groupFilter: {
    //     group,
    //     groupStatus,
    //     groupCategory,
    //     tags,
    //     pipeline,
    //     pipelineStage
    //   },
    //   currentUserId: currentUser._id
    // })

    let tasks = await findAllTasksWithAggregate({
      match,
      limit,
      skip: limit * (page || 1) - limit,
      project: { ...getSelectParams(req) },
      snoozeDetailMatch: { ...snoozeTaskFilter },
      groupFilter: {
        group,
        groupStatus,
        groupCategory,
        tags,
        pipeline,
        pipelineStage
      },
      extraParams: null,
      sort,
      currentUserId: currentUser._id
    })
    tasks = tasks.map((obj) => ({
      ...obj,
      contact: obj?.contact?.[0] || null,
      assigned: obj?.assigned || null,
      createdBy: obj?.createdBy?.[0] || null,
      sub_tasks:
        obj?.sub_tasks?.filter((subTask) => (completed === 'true' ? subTask.completed : !subTask.completed))?.length ||
        0
    }))

    return generalResponse(res, { tasks }, 'success')
  } catch (error) {
    console.log({ error })
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getKanbanTaskList = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { role, _id, company } = currentUser

    let {
      limit = 100000,
      page = 1,
      search = '',
      priority,
      status,
      trash,
      assigned,
      category,
      frequency,
      contact,
      completed,
      open,
      sort,
      group,
      groupStatus,
      groupCategory,
      tags,
      pipeline,
      pipelineStage,
      snoozedTask = false,
      currentKanbanView
    } = req.query
    sort = parseData(sort)

    status = parseData(status)
    priority = parseData(priority)
    category = parseData(category)

    let match = {}
    let subTaskFilter = {}
    const isIncludeSubTasks = true
    // for search

    if (search) {
      // const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
      // const reg = new RegExp(searchString, 'i')
      // console.log({ reg })
      // const tempSearch = {
      //   $or: [{ taskNumber: { $regex: reg } }, { name: { $regex: reg } }]
      // }
      // match = { ...match, $and: [...(match?.$and || []), tempSearch] }

      const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
      const reg = new RegExp(searchString, 'i')
      const tempSearch = {
        $or: [{ taskNumber: { $regex: reg } }, { name: { $regex: reg } }]
      }
      if (isIncludeSubTasks) {
        tempSearch.$or.push(...[{ 'sub_tasks.taskNumber': { $regex: reg } }, { 'sub_tasks.name': { $regex: reg } }])
      }

      match = { ...match, $and: [...(match?.$and || []), tempSearch] }
      if (isIncludeSubTasks) {
        const tempSubSearch = {
          $or: [{ taskNumber: { $regex: reg } }, { name: { $regex: reg } }]
        }
        subTaskFilter = { ...subTaskFilter, $and: [...(subTaskFilter?.$and || []), tempSubSearch] }
      }
    }

    // user can only show created by & assigned
    if (role === 'user') {
      const taskUsers = currentUser.taskManagerUsers
      const assignedUsers = [ObjectId(_id)]

      if (taskUsers && taskUsers.length) {
        assignedUsers.push(...taskUsers.map((uId) => ObjectId(uId)))
      }

      const tempUser = {
        $or: [{ createdBy: ObjectId(_id) }, { assigned: { $in: assignedUsers } }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempUser] }
    }

    // ============================
    // if (status || priority) {
    //   const $and = []

    //   if (_.isArray(priority)) {
    //     const $or = []
    //     $or.push({ priority: { $in: priority.map((value) => ObjectId(value)) } })
    //     $and.push({ $or })
    //   }
    //   if (_.isArray(status)) {
    //     const $or = []
    //     $or.push({ status: { $in: status.map((value) => ObjectId(value)) } })
    //     $and.push({ $or })
    //   }

    //   if (_.isArray(match.$and) && $and?.length) {
    //     // match = { ...match, $and: [...([...match?.$and, ...$and] || [])] }
    //     match = { ...match, $and: [...match.$and, ...$and] || [] }
    //   } else {
    //     match = { ...match, $and }
    //   }
    // }
    if (status || priority) {
      const $and = []

      if (_.isArray(priority)) {
        const $or = []
        $or.push({
          priority: {
            $in: priority.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
        if (isIncludeSubTasks) {
          $or.push({
            'sub_tasks.priority': {
              $in: priority.map((value) => {
                if (value === 'unassigned') {
                  return null
                }
                return ObjectId(value)
              })
            },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          })
        }
        $and.push({ $or })
      }
      if (_.isArray(status)) {
        const $or = []
        $or.push({
          status: {
            $in: status.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
        if (isIncludeSubTasks) {
          $or.push({
            'sub_tasks.status': {
              $in: status.map((value) => {
                if (value === 'unassigned') {
                  return null
                }
                return ObjectId(value)
              })
            },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          })
        }
        $and.push({ $or })
      }

      if (_.isArray(match.$and) && $and?.length) {
        // match = { ...match, $and: [...([...match?.$and, ...$and] || [])] }
        match = { ...match, $and: [...match.$and, ...$and] || [] }
      } else {
        match = { ...match, $and }
      }

      if (isIncludeSubTasks) {
        subTaskFilter = { ...subTaskFilter, $and: [...(subTaskFilter?.$and || []), ...$and] }
      }
    }

    // ============================

    // if (assigned) {
    //   const tempAssigned = {
    //     assigned: ObjectId(assigned)
    //   }
    //   match = { ...match, $and: [...(match?.$and || []), tempAssigned] }
    // }
    // if (frequency) {
    //   const tempFrequency = {
    //     frequency
    //   }
    //   match = { ...match, $and: [...(match?.$and || []), tempFrequency] }
    // }
    // if (contact) {
    //   const tempContact = {
    //     contact: ObjectId(contact)
    //   }
    //   match = { ...match, $and: [...(match?.$and || []), tempContact] }
    // }
    if (assigned) {
      const tempAssigned = {
        $or: [
          { assigned: ObjectId(assigned) },
          {
            'sub_tasks.assigned': ObjectId(assigned),
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { assigned: ObjectId(assigned) }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempAssigned] }
    }
    if (frequency) {
      const tempFrequency = {
        $or: [
          { frequency },
          {
            'sub_tasks.frequency': frequency,
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { frequency }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempFrequency] }
    }
    if (contact) {
      const tempContact = {
        $or: [
          { contact: ObjectId(contact) },
          {
            'sub_tasks.contact': ObjectId(contact),
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { contact: ObjectId(contact) }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempContact] }
    }

    // if (category?.length) {
    //   const tempcategory = {
    //     category: {
    //       // eslint-disable-next-line array-callback-return
    //       $in: category?.map((value) => {
    //         if (value === 'unassigned') {
    //           return null
    //         }
    //         if (ObjectId.isValid(value)) {
    //           return ObjectId(value)
    //         }
    //       })
    //     }
    //   }
    //   match = { ...match, $and: [...(match?.$and || []), tempcategory] }
    // }

    if (category?.length) {
      // eslint-disable-next-line array-callback-return
      const categories = category?.map((value) => {
        if (value === 'unassigned') {
          return null
        }
        if (ObjectId.isValid(value)) {
          return ObjectId(value)
        }
      })
      const tempcategory = {
        $or: [
          { category: { $in: categories } },
          {
            'sub_tasks.category': { $in: categories },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      match = { ...match, $and: [...(match?.$and || []), tempcategory] }

      if (isIncludeSubTasks) {
        subTaskFilter = {
          ...subTaskFilter,
          $and: [...(subTaskFilter?.$and || []), { category: { $in: categories } }]
        }
      }
    }

    if (completed || open) {
      match = {
        ...match,
        completed: completed === 'true'
      }
    }

    let snoozeTaskFilter = {}

    if (snoozedTask === 'false') {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        'snoozeDetail.hideSnoozeTask': { $ne: true }
      }
    }

    if (snoozedTask === 'true') {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        snoozeDetail: { $ne: null }
      }
    }

    match = {
      ...match,
      company: ObjectId(company),
      trash: trash === 'true'
    }

    //
    // if (category === null) {
    //   const tempcategory = {
    //     $or: [
    //       { category: { $eq: null } },
    //       {
    //         'sub_tasks.category': { $eq: null },
    //         'sub_tasks.completed': completed === 'true',
    //         'sub_tasks.trash': trash === 'true'
    //       }
    //     ]
    //   }
    //   match = { ...match, $and: [...(match?.$and || []), tempcategory] }
    //   if (isIncludeSubTasks) {
    //     subTaskFilter = {
    //       ...subTaskFilter,
    //       $and: [...(subTaskFilter?.$and || []), { category: { $eq: null } }]
    //     }
    //   }
    // }

    match.parent_task = null
    const tasks = await findAllTasksWithAggregateForKanbanView({
      match,
      limit: Number(limit),
      page: Number(page) || 1,
      skip: limit * (page || 1) - limit,
      project: { ...getSelectParams(req) },
      snoozeDetailMatch: { ...snoozeTaskFilter },
      groupFilter: {
        group,
        groupStatus,
        groupCategory,
        tags,
        pipeline,
        pipelineStage
      },
      extraParams: { subTaskFilter },
      sort,
      currentUserId: currentUser._id,
      currentView: currentKanbanView
    })

    const snoozedTasks = await findAllSnoozedTasksCounts({
      match,
      extraParams: { subTaskFilter },
      groupFilter: {
        group,
        groupStatus,
        groupCategory,
        tags,
        pipeline,
        pipelineStage
      },
      currentUserId: currentUser._id
    })
    // tasks = tasks.map((obj) => ({
    //   ...obj,
    //   contact: obj?.contact?.[0] || null,
    //   assigned: obj?.assigned || null,
    //   createdBy: obj?.createdBy?.[0] || null,
    //   sub_tasks:
    //     obj?.sub_tasks?.filter((subTask) => (completed === 'true' ? subTask.completed : !subTask.completed))?.length ||
    //     0
    // }))

    return generalResponse(res, { tasks, totalSnoozeTasks: snoozedTasks[0]?.totalSnoozedTasks || 0 }, 'success')
  } catch (error) {
    console.log({ error })
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getAllTasks = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser
    let {
      populate = [],
      sort,
      priority,
      status,
      category,
      contact,
      assigned,
      frequency,
      parent_task,
      trash,
      search,
      completed,
      snoozedTask = false
    } = req.query

    if (completed === 'true') completed = true
    if (completed === 'false') completed = false
    if (trash === 'true') trash = true
    if (trash === 'false') trash = false
    if (snoozedTask === 'true') snoozedTask = true
    if (snoozedTask === 'false') snoozedTask = false

    if (priority) {
      delete req.query.priority
    }
    if (status) {
      delete req.query.status
    }
    if (category) {
      delete req.query.category
    }
    if (contact) delete req.query.contact
    if (assigned) delete req.query.assigned
    if (frequency) delete req.query.frequency

    status = parseData(status)
    priority = parseData(priority)
    category = parseData(category)

    populate = customParse(populate)
    sort = customParse(sort)

    const populatePriority = populate.some((el) => el.path === 'priority')
    const populateStatus = populate.some((el) => el.path === 'status')
    const populateCategory = populate.some((el) => el.path === 'category')

    // ============================
    const $or = []
    // if (priority) {
    //   if (_.isArray(priority)) {
    //     $or.push({ priority: { $in: priority.map((value) => ObjectId(value)) } })
    //   } else {
    //     $or.push({ priority: ObjectId(priority) })
    //   }
    // }
    // if (status) {
    //   if (_.isArray(status)) {
    //     $or.push({ status: { $in: status.map((value) => ObjectId(value)) } })
    //   } else {
    //     $or.push({ status: ObjectId(status) })
    //   }
    // }
    // if (category) {
    //   if (_.isArray(category)) {
    //     $or.push({ category: { $in: category.map((value) => ObjectId(value)) } })
    //   } else {
    //     $or.push({ category: ObjectId(category) })
    //   }
    // }
    // ============================

    // ============================
    const $and = []
    if (priority) {
      if (_.isArray(priority)) {
        $and.push({
          priority: {
            $in: priority.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
      } else {
        $and.push({ priority: ObjectId(priority) })
      }
    }
    if (status) {
      if (_.isArray(status)) {
        $and.push({
          status: {
            $in: status.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
      } else {
        $and.push({ status: ObjectId(status) })
      }
    }

    if (contact) $and.push({ contact: ObjectId(contact) })
    if (category) {
      if (_.isArray(category)) {
        $and.push({ category: { $in: category.map((value) => ObjectId(value)) } })
      } else {
        $and.push({ category: ObjectId(category) })
      }
    }
    // if (category?.length) $and.push({ category: { $in: category?.map((c) => ObjectId(c)) } })

    if (assigned) $and.push({ assigned: ObjectId(assigned) })
    if (frequency) $and.push({ frequency })
    // ============================

    // ===========================
    if (search) {
      const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
      const reg = new RegExp(searchString, 'i')
      $and.push({ $or: [{ name: { $regex: reg } }, { taskNumber: { $regex: reg } }] })
    }
    // ===========================

    let tasks = []

    // ========================  22/04/2023
    // if (sort) {

    const match = { ...req.query }
    delete match.populate
    delete match.sort
    delete match.select
    delete match.status
    delete match.priority
    delete match.category
    delete match.contact
    delete match.assigneed
    delete match.frequency
    delete match.trash
    delete match.snoozedTask
    delete match.search
    delete match.completed

    if (parent_task === '') {
      parent_task = null
    }
    if (parent_task) {
      parent_task = ObjectId(parent_task)
    }

    let snoozeTaskFilter = {}
    if (!snoozedTask) {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        'snoozeDetail.hideSnoozeTask': { $ne: true }
      }
    }

    if (snoozedTask) {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        snoozeDetail: { $ne: null }
      }
    }

    tasks = await findAllTasksWithAggregateWithoutLimit({
      match: {
        ...match,
        ...(trash !== undefined && { trash }),
        ...(completed !== undefined && { completed }),
        company: ObjectId(company),
        ...(parent_task !== undefined ? { parent_task } : {}),
        ...($or.length ? { $or } : {}),
        ...($and.length ? { $and } : {})
      },
      snoozeDetailMatch: { ...snoozeTaskFilter },
      project: req.query.select && getSelectParams(req),
      sort,
      currentUserId: currentUser._id
    })

    tasks = tasks.map((obj) => {
      return {
        ...obj,
        contact: obj?.contact?.[0] || obj?.contact || null,
        createdBy: obj?.createdBy?.[0] || obj?.createdBy || null,
        priority: populatePriority ? obj?.priorityObj?.[0] : obj?.priority,
        status: populateStatus ? obj?.statusObj?.[0] : obj?.status,
        category: populateCategory ? obj?.categoryObj?.[0] : obj?.category,
        priorityObj: undefined,
        statusObj: undefined
      }
    })
    // ========================  22/04/2023
    // } else {
    //   tasks = await findAllTasks({
    //     params: {
    //       ...req.query,
    //       company: ObjectId(company),
    //       ...($or.length && { $or }),
    //       ...($and.length && { $and }),
    //       ...(trash !== undefined && { trash })
    //     },
    //     projection: getSelectParams(req),
    //     populate,
    //     sort
    //   })
    // }
    // ========================  22/04/2023

    const totalTasks = await findTotalTasks({
      ...req.query,
      ...(trash !== undefined && { trash }),
      company: ObjectId(company),
      ...($or.length && { $or }),
      ...($and.length && { $and })
    })

    return generalResponse(res, { tasks, pagination: { total: totalTasks } }, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getMultipleParentSubTasks = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser
    const { parent_task_ids } = req.body

    let {
      populate = [],
      sort,
      priority,
      status,
      category,
      contact,
      assigned,
      frequency,
      trash,
      search,
      completed,
      snoozedTask = false
    } = req.query

    if (completed === 'true') completed = true
    if (completed === 'false') completed = false
    if (trash === 'true') trash = true
    if (trash === 'false') trash = false
    if (snoozedTask === 'true') snoozedTask = true
    if (snoozedTask === 'false') snoozedTask = false

    if (priority) {
      delete req.query.priority
    }
    if (status) {
      delete req.query.status
    }
    if (category) {
      delete req.query.category
    }
    if (contact) delete req.query.contact
    if (assigned) delete req.query.assigned
    if (frequency) delete req.query.frequency

    status = parseData(status)
    priority = parseData(priority)
    category = parseData(category)

    populate = customParse(populate)
    sort = customParse(sort)

    const $and = []
    if (priority) {
      if (_.isArray(priority)) {
        $and.push({
          priority: {
            $in: priority.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
      } else {
        $and.push({ priority: ObjectId(priority) })
      }
    }
    if (status) {
      if (_.isArray(status)) {
        $and.push({
          status: {
            $in: status.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
      } else {
        $and.push({ status: ObjectId(status) })
      }
    }

    if (contact) $and.push({ contact: ObjectId(contact) })
    if (category?.length) $and.push({ contact: { $in: ObjectId(category) } })

    if (assigned) $and.push({ assigned: ObjectId(assigned) })
    if (frequency) $and.push({ frequency })

    if (search) {
      const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
      const reg = new RegExp(searchString, 'i')
      $and.push({ $or: [{ name: { $regex: reg } }, { taskNumber: { $regex: reg } }] })
    }

    const reqQuery = { ...req.query }
    delete reqQuery.populate
    delete reqQuery.sort
    delete reqQuery.select
    delete reqQuery.status
    delete reqQuery.priority
    delete reqQuery.category
    delete reqQuery.contact
    delete reqQuery.assigneed
    delete reqQuery.frequency
    delete reqQuery.trash
    delete reqQuery.snoozedTask
    delete reqQuery.search
    delete reqQuery.completed

    const tasks = await findAllTasks({
      params: {
        ...reqQuery,
        ...(trash !== undefined && { trash }),
        ...(completed !== undefined && { completed }),
        ...($and.length ? { $and } : {}),
        company: ObjectId(company),
        parent_task: { $in: parent_task_ids }
      },
      projection: getSelectParams(req),
      populate,
      sort
    })
    const totalTasks = await findTotalTasks({
      ...reqQuery,
      ...(trash !== undefined && { trash }),
      ...(completed !== undefined && { completed }),
      ...($and.length ? { $and } : {}),
      company: ObjectId(company),
      parent_task: { $in: parent_task_ids }
    })
    return generalResponse(res, { tasks, pagination: { total: totalTasks } }, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getTaskDetailById = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser

    let tasks = null
    if (currentUser?.role === 'user') {
      const taskUsers = currentUser.taskManagerUsers
      const assignedUsers = [ObjectId(currentUser?._id)]

      if (taskUsers && taskUsers.length) {
        assignedUsers.push(...taskUsers.map((uId) => ObjectId(uId)))
      }

      tasks = await findOneTask(
        {
          _id: ObjectId(req.params.id),
          company: ObjectId(company),
          // createdBy: new ObjectId(currentUser?._id),
          $or: [
            {
              assigned: { $in: assignedUsers }
            },
            {
              assigned: []
            }
          ]
        },
        getSelectParams(req)
      )
    } else {
      tasks = await findOneTask({ _id: ObjectId(req.params.id), company: ObjectId(company) }, getSelectParams(req))
    }
    return generalResponse(res, tasks, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const cloneTask = async (req, res, next) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { id } = req.params
    const { clone_task_type, parent_task } = req.body
    const task = await findOneTask({ _id: id }, {})
    if (task) {
      const lastTask = await findLastTask({
        params: { company: ObjectId(currentUser.company) },
        projection: { taskNumber: 1 }
      })
      const newTaskNumber = !lastTask?.taskNumber ? 1000 : +lastTask.taskNumber + 1
      if (task.schedule) delete task.schedule._id
      let newTask = await createTasks(
        [
          {
            taskNumber: `${newTaskNumber}`,
            name: task.name,
            order: 0,
            kanbanCategoryOrder: 0,
            kanbanStatusOrder: 0,
            kanbanPriorityOrder: 0,
            details: task.details,
            startDate: task.startDate,
            endDate: task.endDate,
            frequency: task.frequency,
            priority: task.priority?._id,
            status: task.status?._id,
            parent_task: clone_task_type === 'child_task' ? parent_task : null,
            contact: task.contact?._id,
            assigned: task.assigned?.map((el) => el._id),
            est_time_complete: task.est_time_complete,
            company: ObjectId(currentUser.company),
            createdBy: currentUser._id,
            completed: false,
            trash: false,
            deleted: false,
            schedule: {
              ...task.schedule
            },
            attachments: task.attachments,
            checklistDetails: {
              checklistTemplate: task.checklistDetails?.checklistTemplate?._id,
              checklist: task.checklistDetails?.checklist.map((el) => ({
                title: el.title,
                details: el.details,
                checked: el.checked,
                sort: el.sort,
                updatedBy: el.updatedBy,
                checkedTimeAt: el.checkedTimeAt
              }))
            },
            category: task.categoty?._id
          }
        ],
        ['contact', 'status', 'assigned', 'category', 'createdBy', 'priority', 'parent_task']
      )

      newTask = newTask.map((obj) => {
        return {
          ...obj.toJSON(),
          priority: obj.priority?._id,
          status: obj.status?._id,
          category: obj.category?._id,
          assigned: obj.assigned.map((el) => ({
            _id: el._id,
            firstName: el.firstName,
            lastName: el.lastName,
            email: el.email,
            userProfile: el.userProfile
          })),
          createdBy: {
            _id: obj.createdBy._id,
            firstName: obj.createdBy.firstName,
            lastName: obj.createdBy.lastName,
            email: obj.createdBy.email
          },
          sub_tasks: 0,
          priorityObj: [
            ...(obj.priority
              ? [{ _id: obj.priority._id, createdAt: obj.priority.createdAt, order: obj.priority.order }]
              : [])
          ],
          statusObj: [
            ...(obj.status ? [{ _id: obj.status._id, createdAt: obj.status.createdAt, order: obj.status.order }] : [])
          ],
          categoryObj: [
            ...(obj.category
              ? [{ _id: obj.category._id, createdAt: obj.category.createdAt, order: obj.category.order }]
              : [])
          ],
          assigneeName: obj.assigned.firstName
        }
      })
      return generalResponse(res, newTask[0], 'success')
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    return generalResponse(res, error?.message ? error?.message : error, '', 'error', false, 400)
  }
}

export const pinTask = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser
    const { pinned } = req.body
    if (pinned) {
      await createPinnedUserTask({
        company: ObjectId(company),
        userId: currentUser._id,
        taskId: req.params.id,
        pinned: 1
      })
      return generalResponse(res, null, 'Task pinned successfully.')
    } else {
      await deletePinnedUserTask({ company: ObjectId(company), userId: currentUser._id, taskId: req.params.id })
      return generalResponse(res, null, 'Task unpinned successfully.')
    }
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const snoozedTasks = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser
    const { snoozeUntil, hideSnoozeTask, snoozeForEveryone } = req.body

    const checkSnoozeIsExist = await findSnoozedUserTask({
      company: ObjectId(company),
      user: currentUser._id,
      task: req.params.id
    })
    if (checkSnoozeIsExist) {
      return generalResponse(res, false, { text: 'Task is Already in snoze.' }, 'error', false, 400)
    }

    const users = await findAllUser({ ...req.query, company: ObjectId(company) })

    const tempObj = []

    if (snoozeForEveryone && users.length) {
      users.forEach((user) => {
        tempObj.push({
          company: ObjectId(company),
          user: user._id,
          task: req.params.id,
          snoozedBy: currentUser._id,
          snoozeUntil,
          hideSnoozeTask
        })
      })
    } else {
      tempObj.push({
        company: ObjectId(company),
        user: currentUser._id,
        task: req.params.id,
        snoozedBy: currentUser._id,
        snoozeUntil,
        hideSnoozeTask
      })
    }
    const newSnoozedTask = await createBulkTaskSnooze(tempObj)

    if (newSnoozedTask) {
      const userIds = tempObj?.map((temp) => temp?.user)

      await deleteMuliplePinnedUserTask({
        userId: { $in: userIds },
        company: ObjectId(company),
        taskId: req.params.id
      })
    }

    const newSnoozeDetails = await findSnoozedUserTask({
      company: ObjectId(company),
      user: currentUser._id,
      task: req.params.id
    })

    return generalResponse(res, newSnoozeDetails, 'Task Snoozed successfully.')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteTaskDetail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser
    const currentTask = await findOneTask({ _id: ObjectId(req.params.id), company: ObjectId(company) })

    if (!currentTask) {
      return generalResponse(res, false, { text: 'Task Not Exists.' }, 'error', false, 400)
    }
    if (currentTask.trash) {
      let tempAttachments = [...currentTask?.attachments.map((attachment) => attachment?.fileUrl)]
      const taskUpdates = await findAllTaskUpdates({
        task: ObjectId(req.params.id),
        uploadAttachments: { $exists: true, $gt: [] }
      })
      if (taskUpdates.length) {
        taskUpdates.forEach((taskUpdate) => {
          if (taskUpdate.uploadAttachments?.length) {
            const tempTaskUpdateAttachments = [...taskUpdate.uploadAttachments.map((attachment) => attachment?.fileUrl)]
            tempAttachments = [...tempAttachments, ...tempTaskUpdateAttachments]
          }
        })
      }
      if (_.isArray(tempAttachments) && tempAttachments.length > 0) {
        await deleteAttachmentFromWasabi(tempAttachments)
      }

      await deleteManyTaskUpdates({
        task: ObjectId(req.params.id)
      })
      await deleteTasks({
        $or: [{ _id: ObjectId(req.params.id) }, { parent_task: ObjectId(req.params.id) }],
        company: ObjectId(company)
      })
    } else {
      await updateTasks(
        {
          $or: [{ _id: ObjectId(req.params.id) }, { parent_task: ObjectId(req.params.id) }],
          company: ObjectId(company)
        },
        { trash: true }
      )
    }
    await deleteManySnoozedUserTask({
      company: ObjectId(company),
      task: ObjectId(req.params.id)
    })
    return generalResponse(
      res,
      null,
      currentTask.trash ? 'Task deleted successfully!' : 'Task trashed successfully!',
      'success',
      true
    )
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateTaskDetail = async (req, res) => {
  try {
    // ** Vars **
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser
    const { toast = true, message = 'Task updated successfully!', completedTaskInstruction } = req.body

    let { populate = [] } = req.query
    populate = customParse(populate)

    const isTaskExist = await findOneTask({
      _id: ObjectId(req.params.id),
      company: ObjectId(company)
    })

    if (!isTaskExist) {
      return generalResponse(res, false, { text: 'Status Already Exists.' }, 'error', false, 400)
    }

    // Here check after task template is not exist then create new one
    if (completedTaskInstruction) {
      const isExist = await findAfterTaskInstructionTemplateRepo(
        {
          templateBody: completedTaskInstruction.trim()
        },
        { templateBody: 1 }
      )
      if (!isExist) {
        await createAfterTaskInstructionTemplateRepo({
          company: ObjectId(currentUser.company),
          user: ObjectId(currentUser._id),
          templateBody: completedTaskInstruction
        })
      }
    }

    const assignedUserList = isTaskExist?.assigned?.map((assign) => String(assign._id)) || []
    const newAssignees = req.body?.assigned?.filter((x) => !assignedUserList?.includes(String(x))) ?? []

    // if task move to the completed then need to change task status if user set default setting
    if (req.body.completed && !isTaskExist.completed) {
      req.body.completedAt = moment().utc().format()
      const companyData = await findOneCompany({ _id: ObjectId(company) }, { taskSetting: 1 })
      if (companyData.taskSetting?.completeStatus) {
        req.body.status = companyData.taskSetting.completeStatus
      }
      // update sub task to completed
      await updateTasks(
        { parent_task: ObjectId(req.params.id), company: ObjectId(company) },
        { completed: true, completedAt: moment().utc().format() }
      )

      // Remove Task from the snooze task
      await deleteManySnoozedUserTask({
        company: ObjectId(company),
        task: ObjectId(req.params.id),
        snoozedBy: currentUser?._id
      })
    }

    // if task reopened from completed and parent task is also completed then reopen parent task if completed
    if (!req.body.completed && isTaskExist.completed && isTaskExist.parent_task?.completed) {
      // update parent task
      await updateTask({ _id: isTaskExist.parent_task._id, company: ObjectId(company) }, { completed: false })
    }

    // if task reopened from completed then clear completed date
    if (!req.body.completed && isTaskExist.completed) {
      req.body.completedAt = null
    }

    // if task restored from trash then restore parent task if deleted
    if (!req.body.trash && isTaskExist.trash && isTaskExist.parent_task?.trash) {
      // update parent task
      await updateTask({ _id: isTaskExist.parent_task._id, company: ObjectId(company) }, { trash: false })
    }

    // Add update note when change the status -- >start
    if (req.body.content) {
      await createTaskUpdates({
        content: req.body.content,
        task: ObjectId(req.params.id),
        createdBy: currentUser._id,
        company
      })
    }

    // Add update note when change the status -- >end
    const { parent_task, ...restBody } = req.body
    await updateTask({ _id: ObjectId(req.params.id), company: ObjectId(company) }, { ...restBody }, populate)

    // HELLO
    if (parent_task) {
      await updateTasks(
        {
          $or: [{ _id: ObjectId(req.params.id) }, { parent_task: ObjectId(req.params.id) }],
          company: ObjectId(company)
        },
        { parent_task }
      )
    }

    if (req.body.contact && String(req.body.contact) !== String(isTaskExist.contact?._id)) {
      await createContactActivity({
        eventType: AVAILABLE_EVENT_TYPE.TASK_ASSIGNED,
        contact: ObjectId(req.body.contact),
        eventFor: AVAILABLE_ACTIVITY_FOR.task,
        refId: ObjectId(req.params.id),
        company: ObjectId(currentUser.company),
        createdBy: ObjectId(currentUser._id)
      })
    }

    let tasks = await findAllTasksWithAggregateById({
      match: { _id: ObjectId(req.params.id) },
      limit: 1,
      skip: 0,
      project: {
        ...getSelectParams({
          query: {
            select:
              'name,details,startDate,endDate,category,priority,status,parent_task,trash,completed,frequency,contact,assigned,createdBy,taskNumber'
          }
        })
      }
    })

    tasks = tasks.map((obj) => ({
      ...obj,
      contact: obj?.contact?.[0] || null,
      assigned: obj?.assigned || null,
      sub_tasks: obj?.sub_tasks?.count ?? 0
    }))

    // const oldStatusDetail = await findTaskOption({ _id: req.body?.status })

    // Send Web push and socket notification --> START
    // Here remove the current user from list because no need to send current user
    for (const task of tasks) {
      await sendNotificationJob({
        module: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
        data: {
          company: currentUser.company,
          taskId: task?._id,
          action: TASK_MANAGER_NOTIFICATION_ACTION.TASK_UPDATE,
          createdBy: currentUser,
          newAssignees,
          oldStatus: isTaskExist.status
        }
      })
    }
    // Send Web push and socket notification --> END

    return generalResponse(res, tasks?.[0], message, 'success', toast)
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateTaskDescription = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser
    const { description } = req.body

    const isTaskExist = await findOneTask({
      _id: ObjectId(req.params.id),
      company: ObjectId(company)
    })
    if (!isTaskExist) {
      return generalResponse(res, false, { text: 'Task does not exists.' }, 'error', false, 400)
    }
    await updateTask({ _id: isTaskExist._id, company: ObjectId(company) }, { details: description })
    return generalResponse(res, null)
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateTaskCategory = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser
    const { toast = true, message = 'Task category updated successfully!' } = req.body

    const isTaskExist = await findOneTask({
      _id: ObjectId(req.params.id),
      company: ObjectId(company)
    })
    if (!isTaskExist) {
      return generalResponse(res, false, { text: 'Task not found.' }, 'error', false, 400)
    }

    await updateTask({ _id: ObjectId(req.params.id), company: ObjectId(company) }, { ...req.body })

    return generalResponse(res, null, message, 'success', toast)
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const reOrderTasks = async (req, res) => {
  try {
    let data = req.body
    data = data?.map((obj, index) => ({
      updateOne: {
        filter: {
          _id: obj._id
        },
        update: {
          order: index
        }
      }
    }))
    const tasks = await taskBulkWrite(data || [])
    return generalResponse(res, tasks, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const kanbanReOrderTasks = async (req, res) => {
  try {
    let data = req.body

    data = data?.map((obj, index) => {
      const { _id, ...rest } = obj
      return {
        updateOne: {
          filter: {
            _id: obj._id
          },
          update: {
            ...rest
          }
        }
      }
    })
    const tasks = await taskBulkWrite(data || [])
    return generalResponse(res, tasks, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const taskCronJob = async (req, res) => {
  try {
    // console.log(moment(), new Date(new Date().setHours(0, 0, 0, 0)), new Date(new Date().setHours(23, 59, 59, 999)))
    const commonFilters = [
      {
        $unset: [
          'details',
          // 'startDate',
          // 'endDate',
          'priority',
          // 'status',
          'parent_task',
          'contact',
          'est_time_complete',
          'attachments',
          'company',
          'completed',
          'trash',
          'deleted'
        ]
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assigned',
          foreignField: '_id',
          pipeline: [
            {
              $project: { userProfile: 1, firstName: 1, lastName: 1, email: 1, active: 1, role: 1 }
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
              $project: { firstName: 1, lastName: 1, email: 1, active: 1, userProfile: 1 }
            }
          ],
          as: 'createdBy'
        }
      },
      {
        $lookup: {
          from: 'taskoptions',
          localField: 'status',
          foreignField: '_id',
          pipeline: [
            {
              $project: { label: 1 }
            }
          ],
          as: 'status'
        }
      },
      {
        $unwind: {
          path: '$assigned'
        }
      },
      {
        $unwind: {
          path: '$createdBy'
        }
      },
      {
        $unwind: {
          path: '$status'
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      }
    ]

    // Open Tasks Details
    const openTaskDetails = await Tasks.aggregate([
      {
        $match: {
          trash: false,
          deleted: false,
          completed: false
        }
      },
      ...commonFilters,
      {
        $group: {
          _id: '$assigned',
          openTasks: {
            $push: '$$ROOT'
          }
        }
      }
    ])

    const { taskDetails } = createDailyTaskObject({ openTaskDetails })

    const __dirname = path.resolve()

    taskDetails.forEach(async (taskDetail, index) => {
      if (taskDetail?.contact?.active) {
        const body = await ejs.renderFile(path.join(__dirname, '/src/views/taskNotificationSendDailyTask.ejs'), {
          openTasks: taskDetail?.openTasks || [],
          dueTodayTasks: [],
          overDueTasks: [],
          viewTaskLink:
            taskDetail?.contact?.role === 'user'
              ? `${process.env.HOST_NAME}/member/task-manager`
              : `${process.env.HOST_NAME}/admin/task-manager`
        })

        sendMail({
          receiver: taskDetail?.contact?.email,
          subject: "Today's tasks in XYZ CRM",
          body,
          htmlBody: body
        })
      }
    })
  } catch (error) {
    console.log('error : ', error)
  }
}

export const updateTaskParentDetail = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction({
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' }
  })
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser

    const newParentId = ObjectId(req.body.parent_task)

    await updateTasks(
      { $or: [{ _id: ObjectId(req.params.id) }, { parent_task: ObjectId(req.params.id) }], company: ObjectId(company) },
      { parent_task: newParentId },
      [],
      { session }
    )

    await session.commitTransaction()
    session.endSession()
    return generalResponse(res, null, 'success')
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction()
    session.endSession()
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const setCompleteStatus = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const companyData = await findOneCompany({ _id: ObjectId(currentUser.company) }, { taskSetting: 1 })
    const taskSetting = companyData.taskSetting || {}
    taskSetting.completeStatus = req.body.status || null

    await updateMultipleTaskOption(
      { company: ObjectId(currentUser.company), markAsCompleted: true },
      { markAsCompleted: false }
    )
    await updateTaskOption(
      {
        _id: ObjectId(req.body.status),
        company: ObjectId(currentUser.company)
      },
      { markAsCompleted: true }
    )
    await updateCompany({ _id: ObjectId(currentUser.company) }, { taskSetting })
    return generalResponse(res, null, 'Set Status Successfully.', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const setTaskNumber = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction({
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' }
  })
  try {
    let start = 0

    const companys = await findCompanyWithDeleted({}, { _id: 1 })

    for (const company of companys) {
      const getCompanyTask = await findTaskWithDeleted({
        params: { company: ObjectId(company._id) },
        projection: { taskNumber: 1 },
        sort: { _id: 1 },
        option: { session }
      })

      for (let i = 0; i < getCompanyTask.length; i++) {
        const task = getCompanyTask[i]
        await updateOneTaskWithDeleted({ _id: task._id }, { taskNumber: `${i + 1000}` }, { session })
        start = start + 1
      }
    }

    await session.commitTransaction()
    session.endSession()
    return generalResponse(res, start, 'success')
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction()
    session.endSession()
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const taskTimerDetails = async (req, res, next) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { task_id, current_status, startTime, endTime, timerId } = req.body
    const task = await findOneTaskDetail({ _id: task_id }, { timerDetails: 1 })
    if (task) {
      if (task?.timerDetails) {
        if (current_status === TASK_TIMER_STATUS.start && task.timerDetails.currentStatus === TASK_TIMER_STATUS.end) {
          task.timerDetails.currentStatus = TASK_TIMER_STATUS.start
          if (!_.isArray(task.timerDetails.timer)) {
            task.timerDetails.timer = []
          }
          task.timerDetails.timer.push({
            start: startTime,
            end: endTime,
            startBy: currentUser?._id,
            endBy: endTime ? currentUser?._id : null
          })
        } else if (
          current_status === TASK_TIMER_STATUS.end &&
          task.timerDetails.currentStatus === TASK_TIMER_STATUS.start
        ) {
          task.timerDetails.currentStatus = TASK_TIMER_STATUS.end
          let totalDuration = 0
          let isUpdated = false
          if (timerId && ObjectId.isValid(timerId)) {
            task.timerDetails.timer.forEach((timer) => {
              if (timer._id.equals(ObjectId(timerId))) {
                timer.end = endTime
                timer.endBy = currentUser?._id
                isUpdated = true
              }
              totalDuration = totalDuration + (Number(timer.end) - Number(timer.start))
            })
          }

          if (!isUpdated) {
            totalDuration = 0
            task.timerDetails.timer.forEach((timer) => {
              if (!timer.end) {
                timer.end = endTime
                timer.endBy = currentUser?._id
              }
              totalDuration = totalDuration + (Number(timer.end) - Number(timer.start))
            })
          }
          task.timerDetails.totalTime = totalDuration
        }
      } else {
        task.timerDetails = {
          currentStatus: TASK_TIMER_STATUS.start,
          timer: [
            {
              start: startTime,
              end: endTime,
              startBy: currentUser?._id,
              endBy: endTime ? currentUser?._id : null
            }
          ],
          totalTime: 0
        }
      }
      await updateTask({ _id: task_id }, { timerDetails: task.timerDetails })
      return generalResponse(res, task, 'success')
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    return generalResponse(res, error?.message ? error?.message : error, '', 'error', false, 400)
  }
}

export const printTaskDeatils = async (req, res, next) => {
  try {
    req.query = Object.keys(req.query).reduce(
      (prevObj, key) => ({
        ...prevObj,
        [key]: req.query[key] === 'true' ? true : req.query[key] === 'false' ? false : req.query[key]
      }),
      {}
    )

    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { role, _id, company } = currentUser

    let {
      search = '',
      priority,
      status,
      category,
      trash,
      assigned,
      frequency,
      contact,
      completed,
      open,
      sort,
      group,
      groupStatus,
      groupCategory,
      tags,
      pipeline,
      pipelineStage,
      snoozedTask,
      startDate,
      endDate
    } = req.query

    sort = parseData(sort)

    status = parseData(status)
    priority = parseData(priority)
    category = parseData(category)

    let subTaskFilter = []

    let match = {}
    // for search

    if (search) {
      const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
      const reg = new RegExp(searchString, 'i')
      const tempSearch = {
        $or: [
          { taskNumber: { $regex: reg } },
          { 'sub_tasks.taskNumber': { $regex: reg } },
          { name: { $regex: reg } },
          { 'sub_tasks.name': { $regex: reg } }
        ]
      }

      const tempSubSearch = {
        $or: [{ taskNumber: { $regex: reg } }, { name: { $regex: reg } }]
      }

      match = { ...match, $and: [...(match?.$and || []), tempSearch] }
      subTaskFilter = { ...subTaskFilter, $and: [...(subTaskFilter?.$and || []), tempSubSearch] }
    }

    // user can only show created by & assigned
    if (role === 'user') {
      const taskUsers = currentUser.taskManagerUsers
      const assignedUsers = [ObjectId(_id)]

      if (taskUsers && taskUsers.length) {
        assignedUsers.push(...taskUsers.map((uId) => ObjectId(uId)))
      }

      const tempUser = {
        $or: [{ createdBy: ObjectId(_id) }, { assigned: { $in: assignedUsers } }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempUser] }
    }

    // ============================
    if (status || priority) {
      const $and = []

      if (_.isArray(priority)) {
        const $or = []
        $or.push({
          priority: {
            $in: priority.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
        // if (isIncludeSubTasks) {
        $or.push({
          'sub_tasks.priority': {
            $in: priority.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          },
          'sub_tasks.completed': completed === true,
          'sub_tasks.trash': trash === true
        })
        // }
        $and.push({ $or })
      }
      if (_.isArray(status)) {
        const $or = []
        $or.push({
          status: {
            $in: status.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
        // if (isIncludeSubTasks) {
        $or.push({
          'sub_tasks.status': {
            $in: status.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          },
          'sub_tasks.completed': completed === true,
          'sub_tasks.trash': trash === true
        })
        // }
        $and.push({ $or })
      }

      if (_.isArray(match.$and) && $and?.length) {
        match = { ...match, $and: [...match.$and, ...$and] || [] }
      } else {
        match = { ...match, $and }
      }
      subTaskFilter = { ...subTaskFilter, $and: [...(subTaskFilter?.$and || []), ...$and] }
    }
    // ============================

    if (assigned) {
      const tempAssigned = {
        $or: [
          { assigned: ObjectId(assigned) },
          {
            'sub_tasks.assigned': ObjectId(assigned),
            'sub_tasks.completed': completed === true,
            'sub_tasks.trash': trash === true
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { assigned: ObjectId(assigned) }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempAssigned] }
    }
    if (frequency) {
      const tempFrequency = {
        $or: [
          { frequency },
          {
            'sub_tasks.frequency': frequency,
            'sub_tasks.completed': completed === true,
            'sub_tasks.trash': trash === true
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { frequency }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempFrequency] }
    }

    if (startDate && moment(startDate).isValid() && endDate && moment(endDate).isValid()) {
      match = {
        ...match,
        $or: [
          {
            $and: [
              {
                startDate: { $lte: new Date(startDate) },
                endDate: { $gte: new Date(endDate) }
              }
            ]
          },
          {
            startDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
          },
          {
            endDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
          }
        ]
      }
    }

    if (contact) {
      const tempContact = {
        $or: [
          { contact: ObjectId(contact) },
          {
            'sub_tasks.contact': ObjectId(contact),
            'sub_tasks.completed': completed === true,
            'sub_tasks.trash': trash === true
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { contact: ObjectId(contact) }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempContact] }
    }

    if (category === null) {
      const tempcategory = {
        $or: [
          { category: { $eq: null } },
          {
            category: { $eq: null },
            'sub_tasks.completed': completed === true,
            'sub_tasks.trash': trash === true
          }
        ]
      }
      match = { ...match, $and: [...(match?.$and || []), tempcategory] }
    }

    if (category?.length) {
      const tempcategory = {
        $or: [
          { category: { $in: category?.map((value) => ObjectId(value)) } },
          {
            category: { $in: category?.map((value) => ObjectId(value)) },
            'sub_tasks.completed': completed === true,
            'sub_tasks.trash': trash === true
          }
        ]
      }
      match = { ...match, $and: [...(match?.$and || []), tempcategory] }
    }

    if (completed || open) {
      match = {
        ...match,
        completed: completed === true
      }
    }

    let snoozeTaskFilter = {}

    if (!snoozedTask) {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        'snoozeDetail.hideSnoozeTask': { $ne: true }
      }
    }

    if (snoozedTask) {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        snoozeDetail: { $ne: null }
      }
    }

    match = {
      ...match,
      company: ObjectId(company),
      trash: trash === true,
      $or: [
        {
          parent_task: { $size: 0 }
        },
        {
          'parent_task.completed': false,
          'parent_task.trash': false
        }
      ]
    }

    let data = await findAllTasksWithAggregateForExport({
      match,
      limit: 10000,
      skip: 0,
      project: {
        taskNumber: 1,
        name: 1,
        startDate: 1,
        endDate: 1,
        est_time_complete: 1,
        frequency: 1,
        parent_task: 1,
        contact: 1,
        assigned: 1
      },
      groupFilter: {
        group,
        groupStatus,
        groupCategory,
        tags,
        pipeline,
        pipelineStage
      },
      snoozeDetailMatch: { ...snoozeTaskFilter },

      extraParams: { subTaskFilter },
      sort,
      currentUserId: currentUser?._id
    })
    data = data?.map((obj) => ({
      order: obj.order,
      taskNumber: obj.taskNumber,
      name: obj.name,
      contact: obj?.contact?.[0] || [],
      snoozeUntil: obj.snoozeUntil
    }))

    return generalResponse(res, data, '', 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteSnoozedTasks = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company } = currentUser
    const currentSnoozeTask = await findSnoozedUserTask({ _id: ObjectId(req.params.id), company: ObjectId(company) })

    if (!currentSnoozeTask) {
      return generalResponse(res, false, { text: 'Task is not in snooze mode.' }, 'error', false, 400)
    }

    if (String(currentSnoozeTask?.snoozedBy) === String(currentUser._id)) {
      await deleteManySnoozedUserTask({
        company: ObjectId(company),
        task: currentSnoozeTask?.task,
        snoozedBy: currentUser?._id
      })
    } else {
      await deleteSnoozedUserTask({ _id: ObjectId(req.params.id), company: ObjectId(company) })
    }
    return generalResponse(res, null, 'Task unsnoozed successfully!', 'success', true)
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getTaskOptionsCount = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { role, _id, company } = currentUser

    let {
      parent_task,
      search = '',
      // includeSubTasks = 'false',
      priority,
      status,
      trash,
      assigned,
      category,
      frequency,
      contact,
      completed,
      open,
      group,
      groupStatus,
      groupCategory,
      tags,
      pipeline,
      pipelineStage,
      snoozedTask
    } = req.query

    status = parseData(status)
    priority = parseData(priority)
    category = parseData(category)

    const isIncludeSubTasks = true

    let subTaskFilter = {}

    let match = {}
    // for search

    if (search) {
      const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
      const reg = new RegExp(searchString, 'i')
      const tempSearch = {
        $or: [{ taskNumber: { $regex: reg } }, { name: { $regex: reg } }]
      }
      if (isIncludeSubTasks) {
        tempSearch.$or.push(...[{ 'sub_tasks.taskNumber': { $regex: reg } }, { 'sub_tasks.name': { $regex: reg } }])
      }

      match = { ...match, $and: [...(match?.$and || []), tempSearch] }
      if (isIncludeSubTasks) {
        const tempSubSearch = {
          $or: [{ taskNumber: { $regex: reg } }, { name: { $regex: reg } }]
        }
        subTaskFilter = { ...subTaskFilter, $and: [...(subTaskFilter?.$and || []), tempSubSearch] }
      }
    }
    if (parent_task === '') {
      match.parent_task = null
    }

    // user can only show created by & assigned
    if (role === 'user') {
      const taskUsers = currentUser.taskManagerUsers
      const assignedUsers = [ObjectId(_id)]

      if (taskUsers && taskUsers.length) {
        assignedUsers.push(...taskUsers.map((uId) => ObjectId(uId)))
      }

      const tempUser = {
        $or: [{ createdBy: ObjectId(_id) }, { assigned: { $in: assignedUsers } }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempUser] }
    }

    // ============================
    if (status || priority) {
      const $and = []

      if (_.isArray(priority)) {
        const $or = []
        $or.push({
          priority: {
            $in: priority.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
        if (isIncludeSubTasks) {
          $or.push({
            'sub_tasks.priority': {
              $in: priority.map((value) => {
                if (value === 'unassigned') {
                  return null
                }
                return ObjectId(value)
              })
            },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          })
        }
        $and.push({ $or })
      }
      if (_.isArray(status)) {
        const $or = []
        $or.push({
          status: {
            $in: status.map((value) => {
              if (value === 'unassigned') {
                return null
              }
              return ObjectId(value)
            })
          }
        })
        if (isIncludeSubTasks) {
          $or.push({
            'sub_tasks.status': {
              $in: status.map((value) => {
                if (value === 'unassigned') {
                  return null
                }
                return ObjectId(value)
              })
            },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          })
        }
        $and.push({ $or })
      }

      if (_.isArray(match.$and) && $and?.length) {
        // match = { ...match, $and: [...([...match?.$and, ...$and] || [])] }
        match = { ...match, $and: [...match.$and, ...$and] || [] }
      } else {
        match = { ...match, $and }
      }

      if (isIncludeSubTasks) {
        subTaskFilter = { ...subTaskFilter, $and: [...(subTaskFilter?.$and || []), ...$and] }
      }
    }
    // ============================

    if (assigned) {
      const tempAssigned = {
        $or: [
          { assigned: ObjectId(assigned) },
          {
            'sub_tasks.assigned': ObjectId(assigned),
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { assigned: ObjectId(assigned) }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempAssigned] }
    }
    if (frequency) {
      const tempFrequency = {
        $or: [
          { frequency },
          {
            'sub_tasks.frequency': frequency,
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { frequency }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempFrequency] }
    }
    if (contact) {
      const tempContact = {
        $or: [
          { contact: ObjectId(contact) },
          {
            'sub_tasks.contact': ObjectId(contact),
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { contact: ObjectId(contact) }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempContact] }
    }
    if (category === null) {
      const tempcategory = {
        $or: [
          { category: { $eq: null } },
          {
            'sub_tasks.category': { $eq: null },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { category: { $eq: null } }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempcategory] }
    }
    if (category?.length) {
      const tempcategory = {
        $or: [
          { category: { $in: category?.map((value) => (value === 'unassigned' ? null : ObjectId(value))) } },
          {
            'sub_tasks.category': { $in: category?.map((value) => (value === 'unassigned' ? null : ObjectId(value))) },
            'sub_tasks.completed': completed === 'true',
            'sub_tasks.trash': trash === 'true'
          }
        ]
      }

      subTaskFilter = {
        ...subTaskFilter,
        $and: [
          ...(subTaskFilter?.$and || []),
          { category: { $in: category?.map((value) => (value === 'unassigned' ? null : ObjectId(value))) } }
        ]
      }
      match = { ...match, $and: [...(match?.$and || []), tempcategory] }
    }

    if (completed || open) {
      match = {
        ...match,
        completed: completed === 'true'
      }
    }

    let snoozeTaskFilter = {}

    if (snoozedTask === 'false') {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        'snoozeDetail.hideSnoozeTask': { $ne: true }
      }
    }

    if (snoozedTask === 'true') {
      snoozeTaskFilter = {
        ...snoozeTaskFilter,
        snoozeDetail: { $ne: null }
      }
    }

    match = {
      ...match,
      // parent_task: null,
      company: ObjectId(company),
      trash: trash === 'true'
    }

    const tasks = await findTasksOptionCount({
      match,
      extraParams: { subTaskFilter },
      snoozeDetailMatch: { ...snoozeTaskFilter },
      groupFilter: {
        group,
        groupStatus,
        groupCategory,
        tags,
        pipeline,
        pipelineStage
      },
      currentUserId: currentUser?._id
    })

    return generalResponse(res, tasks, 'success')
  } catch (error) {
    console.log({ error })
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const disableTaskWarning = async (req, res) => {
  try {
    const { id } = req.params
    const { user } = req.body

    if (!id || !ObjectId.isValid(id)) {
      return generalResponse(res, false, { text: 'Task id is required.' }, 'error', false, 400)
    }

    const task = await findOneTaskDetail({ _id: ObjectId(id) }, { warningDisabledUsers: 1 })

    if (
      task?.warningDisabledUsers?.length &&
      task.warningDisabledUsers.find((userDetail) => String(userDetail) === String(user))
    ) {
      task.warningDisabledUsers = task.warningDisabledUsers.filter((item) => item.toString() !== user)
    } else {
      task.warningDisabledUsers.push(ObjectId(user))
    }
    await updateTask({ _id: ObjectId(id) }, { warningDisabledUsers: task.warningDisabledUsers })
    const updatedWarningUsers = await findOneTaskDetail({ _id: ObjectId(id) }, { warningDisabledUsers: 1 })

    return generalResponse(res, updatedWarningUsers, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const taskMigrateOrder = async (req, res) => {
  try {
    const taskDetails = await Tasks.aggregate([
      {
        $project: {
          createdAt: 1,
          taskNumber: 1,
          company: 1,
          status: 1,
          category: 1,
          priority: 1
        }
      },
      {
        $sort: {
          taskNumber: -1
        }
      },
      {
        $group: {
          _id: '$company',
          tasks: {
            $push: '$$ROOT'
          },
          total: {
            $sum: 1
          }
        }
      }
    ])

    const updateTaskDetail = []
    if (taskDetails.length) {
      taskDetails.forEach((taskDetail) => {
        if (taskDetail.total) {
          const statusWiswData = getGroupByData(taskDetail?.tasks, 'status')
          if (Object.keys(statusWiswData).length) {
            Object.keys(statusWiswData).forEach((status) => {
              if (!['null', 'undefined'].includes(status) && statusWiswData[status]?.length) {
                statusWiswData[status].forEach((tasks, index) => {
                  updateTaskDetail.push({
                    updateOne: {
                      filter: {
                        _id: tasks._id
                      },
                      update: {
                        $set: {
                          kanbanStatusOrder: index
                        }
                      }
                    }
                  })
                })
              }
            })
          }

          const categoryWiswData = getGroupByData(taskDetail?.tasks, 'category')
          if (Object.keys(categoryWiswData).length) {
            Object.keys(categoryWiswData).forEach((category) => {
              if (!['undefined'].includes(category) && categoryWiswData[category]?.length) {
                categoryWiswData[category].forEach((tasks, index) => {
                  updateTaskDetail.push({
                    updateOne: {
                      filter: {
                        _id: tasks._id
                      },
                      update: {
                        $set: {
                          kanbanCategoryOrder: index
                        }
                      }
                    }
                  })
                })
              }
            })
          }

          const priorityWiswData = getGroupByData(taskDetail?.tasks, 'priority')
          if (Object.keys(priorityWiswData).length) {
            Object.keys(priorityWiswData).forEach((priority) => {
              if (!['undefined', 'null'].includes(priority) && priorityWiswData[priority]?.length) {
                priorityWiswData[priority].forEach((tasks, index) => {
                  updateTaskDetail.push({
                    updateOne: {
                      filter: {
                        _id: tasks._id
                      },
                      update: {
                        $set: {
                          kanbanPriorityOrder: index
                        }
                      }
                    }
                  })
                })
              }
            })
          }
        }
      })
    }
    await Tasks.bulkWrite(updateTaskDetail)
    return generalResponse(res, taskDetails, 'success')
  } catch (error) {
    console.log('error : ', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
