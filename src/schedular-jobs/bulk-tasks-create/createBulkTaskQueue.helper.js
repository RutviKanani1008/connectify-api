import { ObjectId } from 'mongodb'
import _ from 'lodash'
import { createBulkTasksSchedulerChildJob } from './createBulkTaskJobSchedulerQueue.helper'
import { createTasks, findLastTask } from '../../repositories/task.repository'
import ejs from 'ejs'
import path from 'path'
import moment from 'moment'
import { sendMail } from '../../services/send-grid'
import { emitRequest } from '../../helper/socket-request.helper'

export const createBulkTasks = async (data, done) => {
  try {
    console.log('===🚀 Bulk Task queue ', new Date().getTime())
    await emitRequest({
      eventName: `current-queue-process-${data.currentUser.company}`,
      eventData: { status: 'in_process', message: 'Creating Bulk Task is in process...' }
    })
    const { contacts } = data

    await Promise.all(
      _.chunk(contacts || [], 100).map((contact100BunchArray, index) =>
        createBulkTasksSchedulerChildJob({
          ...data,
          batchIndex: index,
          totalContacts: contacts.length || 0,
          contacts: contact100BunchArray
        })
      )
    ).then(async () => {
      console.log('===🚀 Bulk Task queue END : ', new Date().getTime())
      return done()
    })
  } catch (error) {
    console.log('error here', error?.message ? error?.message : error)
    return done()
  }
}
export const createBulkTasksChild = async (data, done) => {
  try {
    const __dirname = path.resolve()

    console.log('===🚀 Bulk Task queue --Child-- Process Start.=== : ', new Date().getTime())
    if (_.isArray(data?.contacts)) {
      const { taskData, currentUser, taskPopulate } = data
      const lastTask = await findLastTask({
        params: { company: ObjectId(currentUser.company) },
        projection: { taskNumber: 1 }
      })
      const lastTaskNumber = !lastTask?.taskNumber ? 1000 : +lastTask.taskNumber + 1
      const tempContacts = []
      data.contacts.forEach((contact, index) => {
        tempContacts.push({
          ...taskData[0],
          company: ObjectId(currentUser.company),
          createdBy: currentUser._id,
          taskNumber: `${Number(lastTaskNumber) + index}`,
          contact,
          kanbanCategotyorder: 0,
          kanbanStatusorder: 0,
          kanbanPriorityorder: 0
        })
      })
      const newTasks = await createTasks(tempContacts, taskPopulate)
      if (newTasks.length) {
        newTasks.forEach(async (newTask) => {
          if (newTask.assigned && newTask.assigned.length > 0) {
            const assigneeNames = newTask.assigned
              .map((user) => `${user?.firstName || ''} ${user?.lastName || ''}`)
              .join(', ')

            const commonTemplateData = {
              taskNumber: newTask.taskNumber,
              taskCreatedBy: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
              userProfile:
                (currentUser?.userProfile &&
                  `${process.env.S3_BUCKET_BASE_URL}${currentUser?.userProfile?.replace(/ /g, '%20')}`) ||
                `${process.env.S3_BUCKET_BASE_URL}register/profile-pictures/1677356109912_avatar-blank.png`,
              assigneeName: assigneeNames,
              taskName: newTask?.name || '-',
              taskDueDate: moment(newTask?.endDate).format('MM/DD/YYYY') || '-',
              taskDescription:
                (newTask?.details && `<div dangerouslySetInnerHTML={{ __html: ${newTask?.details}`) || '',
              contact: newTask?.contact && `${newTask?.contact?.firstName || ''} ${newTask?.contact?.lastName || ''}`,
              currentTaskStatus: newTask?.status?.label || '',
              currentTaskPriority: newTask?.priority?.label || '',
              viewTaskLink: `${process.env.HOST_NAME}/task-manager?task=${btoa(newTask?._id)}`
            }

            // const adminUsers = await findCompanyAdminUser(
            //   currentUser.company,
            //   {
            //     email: { $nin: [...newTask.assigned.map((assigned) => assigned.email), currentUser.email] },
            //     active: true
            //   },
            //   { email: 1, firstName: 1, lastName: 1, userProfile: 1, roles: 1, active: 1 }
            // )
            // if (adminUsers && adminUsers.length > 0) {
            //   adminUsers.forEach(async (adminUser) => {
            //     const body = await ejs.renderFile(
            //       path.join(__dirname, '/src/views/taskNotificationSendFirstMail.ejs'),
            //       {
            //         ...commonTemplateData,
            //         assignedTo: assigneeNames
            //       }
            //     )
            //     await sendMail({
            //       receiver: adminUser?.email,
            //       subject: newTask?.name || '-',
            //       body,
            //       htmlBody: body
            //     })
            //   })
            // }

            newTask.assigned.forEach(async (assignedTask) => {
              if (String(assignedTask?._id) !== String(currentUser._id)) {
                const body = await ejs.renderFile(
                  path.join(__dirname, '/src/views/taskNotificationSendFirstMail.ejs'),
                  {
                    ...commonTemplateData,
                    assignedTo: 'you'
                  }
                )
                await sendMail({
                  receiver: assignedTask?.email,
                  subject: newTask?.name || '-',
                  body,
                  htmlBody: body
                })
              }
            })
          }
        })
      }
      const importedContacts = data.batchIndex * 100 + data.contacts.length
      await emitRequest({
        eventName: `current-queue-process-${data.currentUser.company}`,
        eventData: {
          status: importedContacts === data.totalContacts ? 'completed' : 'in_process',
          message: `Creating a task is ${
            importedContacts === data.totalContacts ? 'completed' : 'in process'
          }. ${importedContacts} of ${data.totalContacts} task is created.`
        }
      })
      console.log('===🚀 Bulk Task queue --Child-- Process End.=== : ', new Date().getTime())

      return done()
    }
  } catch (error) {
    console.log('error', error)
    return done()
  }
}
