import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import {
  createTaskOption,
  deleteTaskOption,
  findAllTaskOption,
  findTaskOption,
  taskOptionBulkWrite,
  updateMultipleTaskOption,
  updateTaskOption
} from '../repositories/taskOption.repository'
import { findCompany, findOneCompany, updateCompany } from '../repositories/companies.repository'
import { updateTasks } from '../repositories/task.repository'
import { logger } from '../utils/utils'

export const addTaskOptionDetail = async (req, res) => {
  try {
    const { name, markAsCompleted } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const isTaskOptionExist = await findAllTaskOption({
      value: name.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(req.body.company)
    })
    if (isTaskOptionExist && isTaskOptionExist.length > 0) {
      return generalResponse(res, false, { text: 'Task Option Already Exists.' }, 'error', false, 400)
    }
    if (markAsCompleted) {
      await updateMultipleTaskOption(
        { company: ObjectId(req.body.company), markAsCompleted: true },
        { markAsCompleted: false }
      )
    }
    const newTaskOption = await createTaskOption({
      value: name.replace(/ /g, '-').toLowerCase(),
      label: name,
      ...req.body
    })
    if (markAsCompleted) {
      const companyData = await findOneCompany({ _id: ObjectId(currentUser.company) }, { taskSetting: 1 })
      const taskSetting = companyData.taskSetting || {}
      taskSetting.completeStatus = newTaskOption?._id || null
      await updateCompany({ _id: ObjectId(currentUser.company) }, { taskSetting })
    }
    return generalResponse(
      res,
      newTaskOption,
      newTaskOption.type === 'status'
        ? 'Status added successfully!'
        : newTaskOption.type === 'priority'
        ? 'Priority added successfully!'
        : newTaskOption.type === 'category'
        ? 'Category added successfully!'
        : 'Lable added successfully!',
      'success',
      true
    )
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getTaskOptionDetails = async (req, res) => {
  try {
    const taskOptions = await findAllTaskOption(req.query)
    return generalResponse(res, taskOptions, 'success')
  } catch (error) {
    logger(error)

    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteTaskOptionDetail = async (req, res) => {
  try {
    const { tasks, type, updateOptions } = req.body
    if (tasks && tasks?.length && updateOptions && type) {
      tasks.forEach(async (task) => {
        await updateTasks(
          { _id: new ObjectId(task) },
          {
            ...(type === 'status' ? { status: new ObjectId(updateOptions) } : { priority: new ObjectId(updateOptions) })
          }
        )
      })
    }

    if (type === 'category') {
      const updatedTask = await updateTasks(
        { category: new ObjectId(req.params.id) },
        {
          category: null
        }
      )
      console.log({ updatedTask })
    }

    if (type === 'label') {
      await updateMultipleTaskOption(
        { labels: { $in: [ObjectId(req.params.id)] } },
        { $pull: { labels: ObjectId(req.params.id) } }
      )
    }
    const deleteTaskOptions = await deleteTaskOption({ _id: ObjectId(req.params.id) })
    if (deleteTaskOptions && deleteTaskOptions.acknowledged && deleteTaskOptions.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Task Option Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(
      res,
      null,
      type === 'status'
        ? 'Status deleted successfully!'
        : type === 'priority'
        ? 'Priority deleted successfully!'
        : type === 'category'
        ? 'Category deleted successfully!'
        : 'Label deleted successfully!',
      'success',
      true
    )
  } catch (error) {
    logger(error)

    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const cloneTaskDetails = async (req, res) => {
  try {
    const options = [
      { label: 'No Started', value: 'not-started', color: 'info', type: 'status' },
      { label: 'In Progress', value: 'in-progress', color: 'primary', type: 'status' },
      { label: 'Waiting', value: 'waiting', color: 'danger', type: 'status' },
      { label: 'Deferred', value: 'deferred', color: 'warning', type: 'status' },
      { label: 'Done', value: 'done', color: 'success', type: 'status' },
      { label: 'High', value: 'high', color: 'danger', type: 'priority' },
      { label: 'Normal', value: 'normal', color: 'warning', type: 'priority' },
      { label: 'Low', value: 'low', color: 'success', type: 'priority' }
    ]
    const company = await findCompany({}, { _id: 1 })

    company.forEach(async (c) => {
      options.forEach(async (o) => {
        await createTaskOption({ ...o, company: c._id })
      })
    })
    return generalResponse(res, company.length, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateTaskOptionDetail = async (req, res) => {
  try {
    const { name, type, markAsCompleted } = req.body
    let isTaskOptionExist = await findAllTaskOption({
      value: name.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(req.body.company),
      type
    })
    isTaskOptionExist = isTaskOptionExist.filter((o) => String(o._id) !== String(req.params.id))
    if (isTaskOptionExist && isTaskOptionExist.length > 0) {
      return generalResponse(
        res,
        false,
        {
          text:
            type === 'status'
              ? 'Status Already Exists.'
              : type === 'priority'
              ? 'Priority Already Exists.'
              : type === 'category'
              ? 'Status Already Exists.'
              : 'Label Already Exists.'
        },
        'error',
        false,
        400
      )
    }

    if (markAsCompleted) {
      await updateMultipleTaskOption(
        { company: ObjectId(req.body.company), markAsCompleted: true },
        { markAsCompleted: false }
      )
    }

    const updatedTaskOption = await updateTaskOption(
      { _id: ObjectId(req.params.id), company: ObjectId(req.body.company), type },
      { value: name.replace(/ /g, '-').toLowerCase(), label: name, ...req.body }
    )

    if (updatedTaskOption && updatedTaskOption.matchedCount === 0) {
      return generalResponse(res, false, { text: 'No Status found.' }, 'error', false, 400)
    }

    if (markAsCompleted) {
      const companyData = await findOneCompany({ _id: ObjectId(req.body.company) }, { taskSetting: 1 })
      const taskSetting = companyData.taskSetting || {}
      taskSetting.completeStatus = req.params.id || null
      await updateCompany({ _id: ObjectId(req.body.company) }, { taskSetting })
    }

    const taskOption = await findTaskOption({ _id: ObjectId(req.params.id) })
    return generalResponse(
      res,
      taskOption,
      type === 'status'
        ? 'Status updated successfully!'
        : type === 'priority'
        ? 'Priority updated successfully!'
        : type === 'category'
        ? 'Category updated successfully!'
        : 'Label updated successfully!',
      'success',
      true
    )
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const reOrderTaskOption = async (req, res) => {
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
    const taskOptions = await taskOptionBulkWrite(data || [])
    return generalResponse(res, taskOptions, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
