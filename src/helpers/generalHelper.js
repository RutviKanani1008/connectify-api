import client from '@sendgrid/client'
import cheerio from 'cheerio'

export const customParse = (value) => {
  try {
    const tempValue = JSON.parse(value)
    return tempValue
  } catch (e) {
    return value
  }
}

export const getSelectParams = (req) => {
  const select = {}
  if (req?.query?.select) {
    const projectField = req?.query?.select.split(',')
    if (projectField && projectField.length > 0) {
      projectField.forEach((field) => {
        select[field] = 1
      })
    }
    delete req.query.select
  }
  return select
}

export const getSelectParamsFromBody = (req) => {
  const select = {}
  if (req?.body?.select) {
    const projectField = req?.body?.select.split(',')
    if (projectField && projectField.length > 0) {
      projectField.forEach((field) => {
        select[field] = 1
      })
    }
    delete req.body.select
  }
  return select
}

export const getSendGridStatisticsDetails = async (request, apiKey = process.env.SEND_GRID_API_KEY) => {
  client.setApiKey(apiKey)
  const totalMatrix = {
    blocks: 0,
    bounce_drops: 0,
    bounces: 0,
    clicks: 0,
    deferred: 0,
    delivered: 0,
    invalid_emails: 0,
    opens: 0,
    processed: 0,
    requests: 0,
    spam_report_drops: 0,
    spam_reports: 0,
    unique_clicks: 0,
    unique_opens: 0,
    unsubscribe_drops: 0,
    unsubscribes: 0
  }
  try {
    const res = await client.request(request)
    const [, body] = res
    const responseData = body
    if (responseData.length > 0) {
      responseData.forEach((res) => {
        if (res.stats.length) {
          res.stats.forEach((stats) => {
            Object.keys(stats.metrics).forEach((key) => {
              if (key in totalMatrix) {
                totalMatrix[key] = totalMatrix[key] + stats.metrics[key]
              }
            })
          })
        }
      })
    }
    return totalMatrix
  } catch (err) {
    return totalMatrix
  }
}

const addTasksDetailsInArray = (taskDetails, key, taskDetailsArray) => {
  if (taskDetails.length > 0) {
    taskDetails.forEach((taskDetail) => {
      const obj = {}
      obj[key] = []
      if (taskDetail?.[key]?.length > 0) {
        taskDetail?.[key]?.forEach((task) => {
          obj[key].push({
            taskName: `#${task.taskNumber} - ` + task?.name?.substring(0, 35) + '...' || '-',
            assignedBy: `${task?.createdBy?.firstName || ''} ${task?.createdBy?.lastName || ''}`,
            taskCurrentStatus: `${task?.status?.label || '-'}`,
            createdByUserProfile:
              (task?.createdBy?.userProfile &&
                `${process.env.S3_BUCKET_BASE_URL}${task?.createdBy?.userProfile?.replace(/ /g, '%20')}`) ||
              `${process.env.S3_BUCKET_BASE_URL}register/profile-pictures/1677356109912_avatar-blank.png`,
            taskLink: `${process.env.HOST_NAME}/task-manager?task=${btoa(task._id)}`
          })
        })
      }
      const isExist = taskDetailsArray?.findIndex((task) => String(task.contact?._id) === String(taskDetail?._id?._id))
      if (isExist < 0) {
        obj.contact = taskDetail?._id
        taskDetailsArray.push(obj)
      } else {
        taskDetailsArray[isExist][key] = obj[key]
      }
    })
  }
}

export const createDailyTaskObject = ({ openTaskDetails, overDueTaskDetails, dueTodayTaskDetails }) => {
  const taskDetails = []
  if (openTaskDetails.length > 0) {
    addTasksDetailsInArray(openTaskDetails, 'openTasks', taskDetails)
  }

  // if (overDueTaskDetails.length > 0) {
  //   addTasksDetailsInArray(overDueTaskDetails, 'overDueTasks', taskDetails)
  // }

  // if (dueTodayTaskDetails.length > 0) {
  //   addTasksDetailsInArray(dueTodayTaskDetails, 'dueTodayTasks', taskDetails)
  // }

  return { taskDetails }
}

export const parseHtmlToText = (html) => {
  const $ = cheerio.load(html)
  return $.root().text()
}

export const getGroupByData = (array, key) => {
  return array.reduce((result, currentItem) => {
    const keyValue = currentItem[key]

    if (!result[keyValue]) {
      result[keyValue] = []
    }

    result[keyValue].push(currentItem)

    return result
  }, {})
}
