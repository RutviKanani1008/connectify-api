import { ObjectId } from 'mongodb'
import { customParse, getSelectParams } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import {
  createTaskUpdates,
  deleteTaskUpdates,
  findAllTaskUpdates,
  findLatestUpdate,
  findTaskUpdates,
  updateTaskUpdates
} from '../repositories/taskUpdate.repository'
import moment from 'moment'
import { findLastTask, updateTask } from '../repositories/task.repository'
import { createContactActivity } from '../repositories/contactActivities'
import { AVAILABLE_ACTIVITY_FOR, AVAILABLE_EVENT_TYPE } from '../models/contact-activity'
import { BLANK_AVATAR } from '../constants'
import { deleteAttachmentFromWasabi } from '../middlewares/fileUploader'
import _ from 'lodash'
import { sendNotificationJob } from '../schedular-jobs/notification'
import { NOTIFICATION_MODULE_TYPE, TASK_MANAGER_NOTIFICATION_ACTION } from '../services/notification/constants'

export const addTaskNewUpdate = async (req, res) => {
  try {
    const { content, assignedUsers, task, assigned } = req.body
    const statusId = req.body?.status === 'unassigned' ? null : req.body?.status

    const company = req.body.company || ObjectId(req?.headers?.authorization?.company)
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    // const populate = customParse(req.query.populate || [])
    const populate = [
      {
        path: 'task',
        select: { taskNumber: 1, name: 1, _id: 1 },
        populate: [{ path: 'contact', select: { userProfile: 1, firstName: 1, lastName: 1 } }]
      },
      { path: 'createdBy', select: { userProfile: 1, firstName: 1, lastName: 1 } }
    ]
    const oldTaskUpdates = await findLatestUpdate({ task: ObjectId(task) }, { createdAt: 1, content: 1 }, populate)

    let updatedTaskUpdate = null

    if (content) {
      const taskUpdate = await createTaskUpdates({ ...req.body, company })
      updatedTaskUpdate = await findTaskUpdates(
        { _id: taskUpdate._id },
        { content: 1, createdAt: 1, uploadAttachments: 1 },
        populate
      )

      const assignedUsersUnique = [...new Set(assignedUsers)]

      let oldTaskUpdateProfileLogo = oldTaskUpdates?.createdBy?.userProfile
      oldTaskUpdateProfileLogo =
        oldTaskUpdateProfileLogo && oldTaskUpdateProfileLogo !== 'false'
          ? `${process.env.S3_BUCKET_BASE_URL}${oldTaskUpdateProfileLogo?.replace(/ /g, '%20')}`
          : BLANK_AVATAR

      // mention users
      const comments = []
      if (oldTaskUpdates) {
        comments.push({
          profileLogo: oldTaskUpdateProfileLogo,
          commentBy: `${oldTaskUpdates?.createdBy?.firstName || ''} ${oldTaskUpdates?.createdBy.lastName || ''}`,
          commentDate: moment(oldTaskUpdates?.createdAt).format('MM/DD/YYYY  HH:mm A'),
          comment:
            (oldTaskUpdates?.content && `<div dangerouslySetInnerHTML={{ __html: ${oldTaskUpdates?.content}`) || ''
        })
      }

      await sendNotificationJob({
        module: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
        data: {
          action: TASK_MANAGER_NOTIFICATION_ACTION.ADD_NEW_TASK_COMMENT,
          company: currentUser.company,
          taskId: updatedTaskUpdate?.task?._id,
          createdBy: currentUser,
          mentionedUsers: assignedUsersUnique,
          taskUpdateId: updatedTaskUpdate._id,
          oldComments: comments,
          newAssignees: assigned
        }
      })
    }

    const taskBody = {
      status: statusId,
      assigned: req.body?.assigned
    }

    if (req.body.completed) {
      taskBody.completed = true
      taskBody.completedAt = moment().utc().format()
    }

    // update task status from here
    await updateTask({ _id: req.body.task }, taskBody)

    // Create a Contact Activity
    if (updatedTaskUpdate) {
      const taskDetail = await findLastTask({ params: { _id: req.body.task }, projection: { contact: 1 } })
      if (taskDetail.contact) {
        //
        await createContactActivity({
          eventType: AVAILABLE_EVENT_TYPE.TASK_UPDATE_ADDED,
          contact: taskDetail.contact,
          eventFor: AVAILABLE_ACTIVITY_FOR.taskUpdate,
          refId: updatedTaskUpdate._id,
          company: ObjectId(currentUser.company),
          createdBy: ObjectId(currentUser._id)
        })
      }
    }

    const { removeAttachments = [] } = req.body
    if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
      await deleteAttachmentFromWasabi(removeAttachments)
    }
    return generalResponse(res, updatedTaskUpdate, 'Update Saved.', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getTaskUpdate = async (req, res) => {
  try {
    const company = ObjectId(req?.headers?.authorization?.company)

    const populate = customParse(req.query.populate || [])
    const projection = getSelectParams(req)

    const taskUpdate = await findTaskUpdates({ _id: ObjectId(req.params.id), company }, projection, populate)
    return generalResponse(res, taskUpdate, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getAllTaskUpdates = async (req, res) => {
  try {
    const query = req.query || {}
    const company = ObjectId(req?.headers?.authorization?.company)
    const projection = getSelectParams(req)
    const populate = customParse(req.query.populate || [])

    const taskUpdates = await findAllTaskUpdates({ ...query, company }, projection, populate)
    return generalResponse(res, taskUpdates, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const editTaskUpdateDetail = async (req, res) => {
  try {
    const company = req.body.company || ObjectId(req?.headers?.authorization?.company)
    const populate = customParse(req.query.populate || [])

    const taskUpdates = await updateTaskUpdates({ _id: ObjectId(req.params.id), company }, req.body)
    if (taskUpdates && taskUpdates.matchedCount === 0) {
      return generalResponse(res, false, { text: 'No TaskUpdate found.' }, 'error', false, 400)
    }

    const updatedTaskUpdate = await findTaskUpdates({ _id: ObjectId(req.params.id) }, undefined, populate)

    const taskBody = {
      status: req.body.status
    }

    if (req.body.completed) {
      taskBody.completed = true
      taskBody.completedAt = moment().utc().format()
    }

    // update task status from here
    await updateTask({ _id: updatedTaskUpdate.task }, taskBody)

    const { removeAttachments = [] } = req.body
    if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
      await deleteAttachmentFromWasabi(removeAttachments)
    }

    return generalResponse(res, updatedTaskUpdate, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteTaskUpdateDetail = async (req, res) => {
  try {
    const company = req.body.company || ObjectId(req?.headers?.authorization?.company)

    const taskUpdateDetail = await findTaskUpdates({ _id: ObjectId(req.params.id), company })
    if (taskUpdateDetail?.uploadAttachments) {
      const attachments = taskUpdateDetail?.uploadAttachments?.map((attachments) => attachments?.fileUrl)
      if (_.isArray(attachments) && attachments.length > 0) {
        await deleteAttachmentFromWasabi(attachments)
      }
    }

    const status = await deleteTaskUpdates({ _id: ObjectId(req.params.id), company })
    if (status && status.acknowledged && status.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Task update Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
