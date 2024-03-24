import { findOneTask } from '../../../repositories/task.repository'
import { NOTIFICATION_MODULE_TYPE, TASK_MANAGER_NOTIFICATION_ACTION } from '../constants'
import { TASK_MANAGER_NOTIFICATION_MSG } from '../constants/message.constant'
import { sendWebPushNotification } from '..'
import { sendEmailNotificationIfEnabled } from '../../send-grid'
import ejs from 'ejs'
import path from 'path'
import moment from 'moment'
import { ObjectId } from 'mongodb'
import { findUserWithNotificationSettings } from '../../../repositories/users.repository'
import { BLANK_AVATAR } from '../../../constants'
import { findTaskUpdates } from '../../../repositories/taskUpdate.repository'
import AWS from 'aws-sdk'

const __dirname = path.resolve()

const s3 = new AWS.S3({
  endpoint: `s3.${process.env.WASABI_REGION}.wasabisys.com`,
  region: process.env.WASABI_REGION,
  accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
  secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY
})

export const taskManagerNotificationHelper = async (data) => {
  try {
    const { action, ...rest } = data
    switch (action) {
      case TASK_MANAGER_NOTIFICATION_ACTION.TASK_CREATION:
        await createTaskManagerNotification(rest)
        break
      case TASK_MANAGER_NOTIFICATION_ACTION.TASK_UPDATE:
        await updateTaskManagerNotification(rest)
        break
      case TASK_MANAGER_NOTIFICATION_ACTION.ADD_NEW_TASK_COMMENT:
        await addNewUpdateNotification(rest)
        break
    }
  } catch (error) {
    console.log('Error:taskManagerNotificationHelper', error?.message || error)
  }
}

const createTaskManagerNotification = async (data) => {
  try {
    const { company, taskId, createdBy } = data
    const platformNotificationAssigneeIds = []
    const platformNotificationAdminIds = []
    const __dirname = path.resolve()

    const task = await findOneTask({ _id: taskId }, { name: 1, assigned: 1 })
    if (!task) {
      return
    }

    // Get assigned users (excluding the task creator) with notification settings
    const assignedUsers = await findUserWithNotificationSettings(
      createdBy.company,
      { _id: { $in: [...task.assigned.map((assigned) => assigned._id)], $nin: [ObjectId(createdBy._id)] } },
      { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 },
      'taskManager',
      ['allTaskNotifications', 'taskNotifications']
    )
    const assigneeNames =
      task.assigned?.map((user) => `${user?.firstName || ''} ${user?.lastName || ''}`).join(', ') ?? ''

    // Notify a user about the task, sending mail and platform notification
    const notifyUser = async (user, assignedTo) => {
      const notificationData = {
        taskNumber: task.taskNumber,
        taskCreatedBy: `${createdBy?.firstName || ''} ${createdBy?.lastName || ''}`,
        userProfile:
          (createdBy?.userProfile &&
            `${process.env.S3_BUCKET_BASE_URL}${createdBy?.userProfile?.replace(/ /g, '%20')}`) ||
          `${process.env.S3_BUCKET_BASE_URL}register/profile-pictures/1677356109912_avatar-blank.png`,
        assigneeName: assigneeNames,
        taskName: task?.name || '-',
        taskDueDate: moment(task?.endDate).format('MM/DD/YYYY') || '-',
        taskDescription: (task?.details && `<div dangerouslySetInnerHTML={{ __html: ${task?.details}`) || '',
        contact: task?.contact && `${task?.contact?.firstName || ''} ${task?.contact?.lastName || ''}`,
        currentTaskStatus: task?.status?.label || '',
        currentTaskPriority: task?.priority?.label || '',
        viewTaskLink: `${process.env.HOST_NAME}/task-manager?task=${btoa(task?._id)}`
      }
      const body = await ejs.renderFile(path.join(__dirname, '/src/views/taskNotificationSendFirstMail.ejs'), {
        ...notificationData,
        assignedTo
      })

      // Send email notification if the user has it enabled
      await sendEmailNotificationIfEnabled(user, task?.name || '-', body)
    }

    // Notify assigned users
    for (const assignee of assignedUsers) {
      await notifyUser(assignee, 'you')
      // Push user ID for platform notification if the user has 'platForm' in their notification modes
      if (assignee.notificationModes.includes('platForm')) {
        platformNotificationAssigneeIds.push(assignee._id)
      }
    }

    // Send platform notifications to assigned users if any
    if (platformNotificationAssigneeIds.length) {
      await sendWebPushNotification({
        company,
        createdBy: createdBy._id,
        modelId: taskId,
        modelName: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
        title: TASK_MANAGER_NOTIFICATION_MSG.CREATE_TASK_FOR_ASSIGNEE({ taskName: task.name }),
        userIds: platformNotificationAssigneeIds,
        wePushNotificationTitle: 'Task Manager'
      })
    }

    // Get admin users (excluding assigned user and created user) with notification settings
    const adminUsers = await findUserWithNotificationSettings(
      createdBy.company,
      { email: { $nin: [...task.assigned.map((assigned) => assigned.email), createdBy.email] }, role: 'admin' },
      { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 },
      'taskManager',
      ['allTaskNotifications']
    )

    // Notify admin user
    for (const adminUser of adminUsers) {
      await notifyUser(adminUser, assigneeNames)
      if (adminUser.notificationModes.includes('platForm')) {
        platformNotificationAdminIds.push(adminUser._id)
      }
    }

    // Send platform notifications to admin users if any
    if (platformNotificationAdminIds.length) {
      await sendWebPushNotification({
        company,
        createdBy: createdBy._id,
        modelId: taskId,
        modelName: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
        title: TASK_MANAGER_NOTIFICATION_MSG.CREATE_TASK_FOR_ADMIN({ taskName: task.name }),
        userIds: platformNotificationAdminIds,
        wePushNotificationTitle: 'Task Manager'
      })
    }
  } catch (error) {
    console.log('Error:createTaskManagerNotification', error?.message || error)
  }
}

const updateTaskManagerNotification = async (data) => {
  try {
    const { company, taskId, createdBy: taskUpdatedBy, newAssignees, oldStatus } = data
    const task = await findOneTask({ _id: taskId })
    const __dirname = path.resolve()

    if (!task) {
      return
    }

    const assigneeNames =
      task.assigned?.map((user) => `${user?.firstName || ''} ${user?.lastName || ''}`).join(', ') ?? ''

    const commonTemplateData = {
      taskNumber: task.taskNumber,
      taskCreatedBy: `${taskUpdatedBy?.firstName || ''} ${taskUpdatedBy?.lastName || ''}`,
      userProfile:
        (taskUpdatedBy?.userProfile &&
          `${process.env.S3_BUCKET_BASE_URL}${taskUpdatedBy?.userProfile?.replace(/ /g, '%20')}`) ||
        `${process.env.S3_BUCKET_BASE_URL}register/profile-pictures/1677356109912_avatar-blank.png`,
      assigneeName: assigneeNames,
      taskName: task.name || '-',
      taskDueDate:
        moment(task.endDate)?.format('MM/DD/YYYY') ||
        (task?.endDate && moment(task?.endDate)?.format('MM/DD/YYYY')) ||
        '-',
      taskDescription:
        (task.details && `<div dangerouslySetInnerHTML={{ __html: ${task.details}`) ||
        (task?.details && `<div dangerouslySetInnerHTML={{ __html: ${task?.details}`) ||
        '-',
      contact: task?.contact && `${task?.contact?.firstName || ''} ${task?.contact?.lastName || ''}`,
      currentTaskStatus: task?.status?.label || '',
      currentTaskPriority: task?.priority?.label || '',
      viewTaskLink: `${process.env.HOST_NAME}/task-manager?task=${btoa(taskId)}`
    }

    // Retrieve new assignees with notification settings
    const firstAssignedUsers = await findUserWithNotificationSettings(
      taskUpdatedBy.company,
      {
        _id: { $in: [...newAssignees.map((assigned) => ObjectId(assigned))], $nin: [taskUpdatedBy._id] }
      },
      { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 },
      'taskManager',
      ['allTaskNotifications', 'taskNotifications']
    )

    const firstAssignedNamesString =
      firstAssignedUsers?.map((user) => `${user?.firstName || ''} ${user?.lastName || ''}`)?.join(', ') ?? ''

    // Retrieve admin users with notification settings (excluding updater)
    const adminUsers = await findUserWithNotificationSettings(
      taskUpdatedBy.company,
      { email: { $ne: taskUpdatedBy.email }, role: 'admin' },
      { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 },
      'taskManager',
      ['allTaskNotifications']
    )

    if (firstAssignedUsers.length) {
      const platformNotificationAssigneeIds = []
      const platformNotificationAdminIds = []

      // Create notifications for new assignees
      for (const assignee of firstAssignedUsers) {
        const body = await ejs.renderFile(path.join(__dirname, '/src/views/taskNotificationSendFirstMail.ejs'), {
          ...commonTemplateData,
          assignedTo: 'you'
        })
        await sendEmailNotificationIfEnabled(assignee, task?.name || '-', body)
        if (assignee.notificationModes.includes('platForm')) {
          platformNotificationAssigneeIds.push(assignee?._id)
        }
      }

      // Send platform notifications for new assignees
      if (platformNotificationAssigneeIds.length) {
        await sendWebPushNotification({
          company,
          createdBy: taskUpdatedBy._id,
          modelId: taskId,
          modelName: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
          title: TASK_MANAGER_NOTIFICATION_MSG.NEW_ASSIGNEE_ADD_IN_TASK_FOR_ADMIN({ taskName: task.name }),
          userIds: platformNotificationAssigneeIds,
          wePushNotificationTitle: 'Task Manager'
        })
      }

      // Create notifications for admin (excluding updater and new assignees)
      const adminUsersNotAssigned = adminUsers.filter((admin) => !newAssignees.includes(admin._id?.toString()))
      for (const adminUser of adminUsersNotAssigned) {
        const body = await ejs.renderFile(path.join(__dirname, '/src/views/taskNotificationSendFirstMail.ejs'), {
          ...commonTemplateData,
          assignedTo: firstAssignedNamesString
        })

        await sendEmailNotificationIfEnabled(adminUser, task?.name || '-', body)

        if (adminUser.notificationModes.includes('platForm')) {
          platformNotificationAdminIds.push(adminUser._id)
        }
      }

      // Send platform notifications for admin
      if (platformNotificationAdminIds.length) {
        await sendWebPushNotification({
          company,
          createdBy: taskUpdatedBy._id,
          modelId: taskId,
          modelName: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
          title: TASK_MANAGER_NOTIFICATION_MSG.NEW_ASSIGNEE_ADD_IN_TASK_FOR_ADMIN({ taskName: task.name }),
          userIds: platformNotificationAdminIds,
          wePushNotificationTitle: 'Task Manager'
        })
      }
    }

    const isStatusUpdate = task.status?._id?.toString() !== oldStatus?._id?.toString()

    if (isStatusUpdate) {
      // Generate notifications for changes in status
      const statusUpdateUserIds = []
      const statusUpdateTitle = TASK_MANAGER_NOTIFICATION_MSG.UPDATE_TASK_STATUS({
        statusName: task?.status?.label,
        taskName: task.name || '-'
      })
      const body = await ejs.renderFile(path.join(__dirname, '/src/views/taskChangeStatusNotification.ejs'), {
        taskNumber: task.taskNumber,
        taskName: task.name || task?.name || '-',
        viewTaskLink: `${process.env.HOST_NAME}/task-manager?task=${btoa(task._id)}`,
        taskCreatedByUserLogo: task?.createdBy?.userProfile
          ? `${process.env.S3_BUCKET_BASE_URL}${task?.createdBy?.userProfile?.replace(/ /g, '%20')}`
          : `${process.env.S3_BUCKET_BASE_URL}register/profile-pictures/1677356109912_avatar-blank.png`,
        taskCreatedByUserName: `${task?.createdBy?.firstName || ''} ${task?.createdBy?.lastName || ''}`,
        changedStatusAt: moment().format('MM/DD/YYYY  HH:mm A'),
        changedStatusUserName: `${taskUpdatedBy?.firstName || ''} ${taskUpdatedBy?.lastName || ''}`,
        newStatus: task.status?.label || '',
        oldStatus: oldStatus?.label || 'unassigned'
      })

      for (const adminUser of adminUsers) {
        await sendEmailNotificationIfEnabled(adminUser, `Moved to ${task.status?.label} : ${task.name || '-'}`, body)

        if (adminUser.notificationModes.includes('platForm')) {
          statusUpdateUserIds.push(adminUser._id)
        }
      }

      // Notify the task creator about status update if applicable
      if (task?.createdBy && taskUpdatedBy?._id?.toString() !== task?.createdBy._id?.toString()) {
        const [createdUser] = await findUserWithNotificationSettings(
          taskUpdatedBy.company,
          { email: { $eq: task.createdBy.email } },
          { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 },
          'taskManager',
          ['allTaskNotifications', 'taskNotifications']
        )
        if (createdUser) {
          await sendEmailNotificationIfEnabled(
            createdUser,
            `Moved to ${task.status?.label} : ${task.name || '-'}`,
            body
          )
          if (createdUser.notificationModes.includes('platForm')) {
            statusUpdateUserIds.push(createdUser._id)
          }
        }
      }

      // Send platform notifications for changes in status
      if (statusUpdateUserIds.length) {
        await sendWebPushNotification({
          company,
          createdBy: taskUpdatedBy._id,
          modelId: taskId,
          modelName: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
          title: statusUpdateTitle,
          userIds: statusUpdateUserIds,
          wePushNotificationTitle: 'Task Manager'
        })
      }
    }
  } catch (error) {
    console.log('Error:updateTaskManagerNotification', error?.message || error)
  }
}

const addNewUpdateNotification = async (data) => {
  try {
    const { company, taskId, createdBy: taskUpdatedBy, newAssignees, mentionedUsers, taskUpdateId, oldComments } = data
    const task = await findOneTask({ _id: taskId })

    if (!task) {
      return
    }

    const taskUpdate = await findTaskUpdates(
      { _id: taskUpdateId },
      { content: 1, createdAt: 1, uploadAttachments: 1 },
      { path: 'createdBy', select: { userProfile: 1, firstName: 1, lastName: 1 } }
    )

    const assigneeNames =
      task.assigned?.map((user) => `${user?.firstName || ''} ${user?.lastName || ''}`).join(', ') ?? ''

    const adminUsers = await findUserWithNotificationSettings(
      taskUpdatedBy.company,
      { email: { $ne: taskUpdatedBy.email }, role: 'admin' },
      { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 },
      'taskManager',
      ['allTaskNotifications']
    )

    const mentionedUsersNotificationSettings = await findUserWithNotificationSettings(
      taskUpdatedBy.company,
      { _id: { $in: mentionedUsers.map((el) => ObjectId(el)) }, email: { $ne: taskUpdatedBy.email } },
      { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 },
      'taskManager',
      ['allTaskNotifications', 'taskNotifications']
    )

    const adminUsersNotMentioned = adminUsers.filter((adminUser) => {
      return !mentionedUsers.some((assignedUser) => String(assignedUser) === String(adminUser._id))
    })

    const platformUpdateNotificationAdminIds = []
    const platformUpdateNotificationMentionUserIds = []

    // TEMPLATE VARIABLES
    const contactProfileImage = taskUpdate?.task?.contact?.userProfile
    const contactName = [taskUpdate?.task?.contact?.firstName || '', taskUpdate?.task?.contact?.lastName || '']
      .join(' ')
      .trim()
    const newUpdateCreatorProfileImage =
      taskUpdate?.createdBy?.userProfile && taskUpdate?.createdBy?.userProfile !== 'false'
        ? `${process.env.S3_BUCKET_BASE_URL}${taskUpdate?.createdBy?.userProfile?.replace(/ /g, '%20')}`
        : BLANK_AVATAR

    const taskCommentNotificationBody = await ejs.renderFile(
      path.join(__dirname, '/src/views/taskCommentNotification.ejs'),
      {
        taskNumber: task?.taskNumber,
        comments: [
          {
            profileLogo: taskUpdate?.createdBy?.userProfile,
            commentBy: `${taskUpdate?.createdBy?.firstName || ''} ${taskUpdate?.createdBy.lastName || ''}`,
            commentDate: moment(taskUpdate?.createdAt).format('MM/DD/YYYY  HH:mm A'),
            comment: (taskUpdate?.content && `<div dangerouslySetInnerHTML={{ __html: ${taskUpdate?.content}`) || ''
          },
          ...oldComments
        ],
        taskName: `${task?.name || '-'}`,
        contactName,
        contactProfileImage: contactProfileImage && contactProfileImage !== 'false' ? contactProfileImage : '',
        commentCreatedBy: `${taskUpdate?.createdBy?.firstName || ''} ${taskUpdate?.createdBy.lastName || ''}`,
        commentCreatedUserLogo: newUpdateCreatorProfileImage,
        viewTaskLink: `${process.env.HOST_NAME}/task-manager?task=${btoa(taskUpdate?.task?._id)}&update=true`
      }
    )

    // Get attachments
    const attachments = []
    if (taskUpdate?.uploadAttachments?.length) {
      for (const attachment of taskUpdate?.uploadAttachments) {
        const options = {
          Bucket: process.env.WASABI_BUCKET_NAME,
          Key: attachment?.fileUrl
        }
        const data = await s3.getObject(options).promise()
        attachments.push({
          content: data?.Body?.toString('base64'),
          filename: attachment?.fileName
        })
      }
    }

    if (adminUsersNotMentioned.length) {
      for (const adminUser of adminUsersNotMentioned) {
        await sendEmailNotificationIfEnabled(adminUser, `Updates : ${task?.name}`, taskCommentNotificationBody, [
          ...attachments
        ])
        if (adminUser.notificationModes.includes('platForm')) {
          platformUpdateNotificationAdminIds.push(adminUser._id)
        }
      }
    }

    if (mentionedUsersNotificationSettings.length) {
      for (const user of mentionedUsersNotificationSettings) {
        await sendEmailNotificationIfEnabled(user, `Updates : ${task?.name}`, taskCommentNotificationBody, [
          ...attachments
        ])
        if (user.notificationModes.includes('platForm')) {
          platformUpdateNotificationMentionUserIds.push(user._id)
        }
      }
    }

    // Send platform notifications for admin
    if (platformUpdateNotificationAdminIds.length) {
      await sendWebPushNotification({
        company,
        createdBy: taskUpdate?.createdBy?._id,
        modelId: taskId,
        modelName: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
        title: TASK_MANAGER_NOTIFICATION_MSG.NEW_COMMENT_ADDED_IN_TASK_ADMIN({ taskName: task.name }),
        userIds: platformUpdateNotificationAdminIds,
        wePushNotificationTitle: 'Task Manager'
      })
    }

    // Send platform notifications for admin
    if (platformUpdateNotificationMentionUserIds.length) {
      await sendWebPushNotification({
        company,
        createdBy: taskUpdate?.createdBy?._id,
        modelId: taskId,
        modelName: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
        title: TASK_MANAGER_NOTIFICATION_MSG.NEW_COMMENT_ADDED_IN_TASK_MENTION_USER({ taskName: task.name }),
        userIds: platformUpdateNotificationMentionUserIds,
        wePushNotificationTitle: 'Task Manager'
      })
    }

    // Retrieve new assignees with notification settings
    const firstAssignedUsers = await findUserWithNotificationSettings(
      taskUpdatedBy.company,
      {
        _id: { $in: [...newAssignees.map((assigned) => ObjectId(assigned))], $nin: [taskUpdatedBy._id] }
      },
      { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 },
      'taskManager',
      ['allTaskNotifications', 'taskNotifications']
    )
    if (firstAssignedUsers.length) {
      const firstAssignedNamesString =
        firstAssignedUsers?.map((user) => `${user?.firstName || ''} ${user?.lastName || ''}`)?.join(', ') ?? ''

      const platformNotificationAssigneeIds = []
      const platformNotificationAdminIds = []
      const commonTemplateData = {
        taskNumber: task.taskNumber,
        taskCreatedBy: `${taskUpdatedBy?.firstName || ''} ${taskUpdatedBy?.lastName || ''}`,
        userProfile:
          (taskUpdatedBy?.userProfile &&
            `${process.env.S3_BUCKET_BASE_URL}${taskUpdatedBy?.userProfile?.replace(/ /g, '%20')}`) ||
          BLANK_AVATAR,
        assigneeName: assigneeNames,
        taskName: task?.name || '-',
        taskDueDate: moment(task?.endDate)?.format('MM/DD/YYYY') || '-',
        taskDescription: (task?.details && `<div dangerouslySetInnerHTML={{ __html: ${task?.details}`) || '',
        contact: task?.contact && `${task?.contact?.firstName || ''} ${task?.contact?.lastName || ''}`,
        currentTaskStatus: task?.status?.label || '',
        currentTaskPriority: task?.priority?.label || '',
        viewTaskLink: `${process.env.HOST_NAME}/task-manager?task=${btoa(taskId)}`
      }

      // Create notifications for new assignees
      for (const assignee of firstAssignedUsers) {
        const body = await ejs.renderFile(path.join(__dirname, '/src/views/taskNotificationSendFirstMail.ejs'), {
          ...commonTemplateData,
          assignedTo: 'you'
        })
        await sendEmailNotificationIfEnabled(assignee, task?.name || '-', body)
        if (assignee.notificationModes.includes('platForm')) {
          platformNotificationAssigneeIds.push(assignee?._id)
        }
      }

      // Send platform notifications for new assignees
      if (platformNotificationAssigneeIds.length) {
        await sendWebPushNotification({
          company,
          createdBy: taskUpdatedBy._id,
          modelId: taskId,
          modelName: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
          title: TASK_MANAGER_NOTIFICATION_MSG.NEW_ASSIGNEE_ADD_IN_TASK_FOR_ADMIN({ taskName: task.name }),
          userIds: platformNotificationAssigneeIds,
          wePushNotificationTitle: 'Task Manager'
        })
      }

      // Create notifications for admin (excluding updater and new assignees)
      const adminUsersNotAssigned = adminUsers.filter((admin) => !newAssignees.includes(admin._id?.toString()))
      for (const adminUser of adminUsersNotAssigned) {
        const body = await ejs.renderFile(path.join(__dirname, '/src/views/taskNotificationSendFirstMail.ejs'), {
          ...commonTemplateData,
          assignedTo: firstAssignedNamesString
        })
        await sendEmailNotificationIfEnabled(adminUser, task?.name || '-', body)
        if (adminUser.notificationModes.includes('platForm')) {
          platformNotificationAdminIds.push(adminUser._id)
        }
      }

      // Send platform notifications for admin
      if (platformNotificationAdminIds.length) {
        await sendWebPushNotification({
          company,
          createdBy: taskUpdatedBy._id,
          modelId: taskId,
          modelName: NOTIFICATION_MODULE_TYPE.TASK_MANAGER,
          title: TASK_MANAGER_NOTIFICATION_MSG.NEW_ASSIGNEE_ADD_IN_TASK_FOR_ADMIN({ taskName: task.name }),
          userIds: platformNotificationAdminIds,
          wePushNotificationTitle: 'Task Manager'
        })
      }
    }
  } catch (error) {
    console.log('Error:addNewUpdateNotification', error?.message || error)
  }
}
