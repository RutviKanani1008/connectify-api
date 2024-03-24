/* eslint-disable no-unused-vars */
import path from 'path'
import excelJS from 'exceljs'
import _ from 'lodash'

import { logger } from '../utils/utils'

import taskColumnsData from '../mapper/exportData/task'
import { findAllTasksWithAggregateForExport } from '../repositories/task.repository'

const getMappedColumns = (model) => {
  switch (model) {
    case 'task':
      return taskColumnsData
  }
}

export const exportTaskDataHelper = async ({
  model,
  query,
  fileName,
  subTaskFilter,
  sort,
  match,
  groupFilter,
  currentUserId,
  snoozeDetailMatch
}) => {
  try {
    const __dirname = path.resolve()
    const workbook = new excelJS.Workbook()
    const worksheet = workbook.addWorksheet(model)

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
      groupFilter,
      snoozeDetailMatch: { ...snoozeDetailMatch },
      extraParams: { subTaskFilter },
      sort,
      currentUserId
    })

    data = data?.map((obj) => ({
      ...obj,
      contact: obj?.contact?.[0] || null,
      assigned: obj?.assigned || null,
      createdBy: obj?.createdBy?.[0] || null,
      priority: obj?.priorityObj?.[0] ? obj.priorityObj[0]?.label : null,
      status: obj?.statusObj?.[0] ? obj?.statusObj[0].label : null,
      category: obj?.categoryObj?.[0] ? obj?.categoryObj[0].label : null,
      parent_task: obj?.parent_task?.[0] || null,
      sub_tasks: obj?.sub_tasks?.filter((subTask) => !subTask.completed)?.length || 0
    }))

    // set columns
    const columnData = getMappedColumns(model)
    worksheet.columns = Object.keys(columnData).map((key) => ({ header: columnData[key], key }))

    // arrange the data & nested data
    const arrangedData = reArrangeTheData({ model, data: JSON.parse(JSON.stringify(data)), query })

    if (_.isArray(arrangedData)) {
      arrangedData.forEach((obj) => {
        worksheet.addRow({ ...obj })
      })
    }
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true }
    })
    const filePath = `/files/${fileName || model}-${Date.now()}.xlsx`
    await workbook.xlsx.writeFile(`${__dirname}/public${filePath}`)
    return filePath
  } catch (error) {
    logger(error)
  }
}

const reArrangeTheData = ({ model, data, query }) => {
  if (model === 'task') {
    data = reArrangeTheTaskData({ data, query })
  }
  return data
}

const reArrangeTheTaskData = ({ data = [], query }) => {
  let tempData = [...data]

  if (query.trash !== true && query.snoozedTask !== true) {
    const parentTasks = tempData.filter((obj) => obj.parent_task === null)

    parentTasks.forEach((f) =>
      tempData.splice(
        tempData.findIndex((e) => e._id === f._id),
        1
      )
    )

    let finalData = []
    parentTasks.forEach((parentTask) => {
      parentTask.company_name = parentTask?.contact?.company_name || '-'
      parentTask.contact = [parentTask?.contact?.firstName || '', parentTask?.contact?.lastName || ''].join(' ')
      delete parentTask?.contact?.company_name
      parentTask.assigned_task = parentTask.assigned
        ?.map(
          (assignedTask) =>
            `${assignedTask?.firstName !== null ? assignedTask?.firstName : ''} ${
              assignedTask?.lastName !== null ? assignedTask?.lastName : ''
            }`
        )
        ?.toString()
      const childTasks = tempData.filter((task) => task?.parent_task?._id === parentTask._id)

      childTasks.forEach((child) => {
        child.company_name = child?.contact?.company_name || '-'
        child.contact = [child?.contact?.firstName || '', child?.contact?.lastName || ''].join('')
        delete child?.contact?.company_name
        child.sub_task = child?.name
        child.name = child?.parent_task?.name || ''
        child.assigned_task = child?.assigned
          ?.map(
            (assignedTask) =>
              `${assignedTask?.firstName !== null ? assignedTask?.firstName : ''} ${
                assignedTask?.lastName !== null ? assignedTask?.lastName : ''
              }`
          )
          ?.toString()
      })

      childTasks.forEach((f) =>
        tempData.splice(
          tempData.findIndex((e) => e._id === f._id),
          1
        )
      )
      finalData = [...finalData, parentTask, ...childTasks]
    })

    if (query?.trash === true) {
      finalData = [...finalData, ...tempData]
    }

    return finalData
  } else {
    tempData = tempData.map((obj) => ({
      ...obj,
      company_name: obj?.contact?.company_name || '-',
      contact: [obj?.contact?.firstName || '', obj?.contact?.lastName || ''].join(''),
      sub_task: obj.parent_task !== null ? obj?.name : '',
      name: obj.parent_task === null ? obj?.name : obj?.parent_task?.name || '',
      assigned_task: obj?.assigned
        ?.map(
          (assignedTask) =>
            `${assignedTask?.firstName !== null ? assignedTask?.firstName : ''} ${
              assignedTask?.lastName !== null ? assignedTask?.lastName : ''
            }`
        )
        ?.toString()
    }))
    return tempData
  }
}
