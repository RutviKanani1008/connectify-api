import { ObjectId } from 'mongodb'
import { exportDataHelper } from '../helpers/exportData'
import { exportTaskDataHelper } from '../helpers/exportTaskDataHelper'
import _ from 'lodash'

import generalResponse from '../helpers/generalResponse.helper'
import { logger, parseData } from '../utils/utils'
import { getFilterUserQuery } from '../repositories/users.repository'
import { getFilterContactsQuery } from '../repositories/contact.repository'
import { getFilterDocumentsQuery } from '../repositories/documents.repository'
import { getFilterFormsQuery } from '../repositories/forms.repository'
import { getFilterEmailTemplatesQuery } from '../repositories/emailTemplates.repository'
import { getFilterSmsTemplatesQuery } from '../repositories/smsTemplates.repository'
import { io } from '../app'
import { getFilterProductQuery } from '../repositories/inventoryProduct.repository'
import { getFilterOrdersQuery } from '../repositories/inventoryOfflineOrder.repository'
import { updateMultiplePositions } from '../repositories/general.repository'
import { findCompany, getFilterCompanyQuery } from '../repositories/companies.repository'
import { findAllGroups } from '../repositories/groups.repository'
import { findAllStatus } from '../repositories/status.repository'
import { findAllCategory } from '../repositories/category.repository'
import { findAllTags } from '../repositories/tags.repository'
import { findAllCustomField } from '../repositories/customFields.repository'
import moment from 'moment'
import { getFilterNoteQuery } from '../repositories/note.repository'
import { ReportProblem } from '../models/reportProblem'

// temporary fix for export api
const updatedQueryModals = [
  'company',
  'user',
  'contact',
  'document',
  'form',
  'emailTemplate',
  'smsTemplate',
  'inventoryproducts',
  'inventoryOfflineOrder',
  'notes'
]

export const exportData = async (req, res) => {
  try {
    const { model, fileName, ...otherFilter } = req.query
    const currentUser = req.headers.authorization

    const queryObj = {
      task: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company),
          $or: [{ createdBy: currentUser._id }, { assigned: currentUser._id }]
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      user: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      form: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      contact: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      group: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      status: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      category: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      tag: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      notes: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      customField: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      massSMS: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      emailTemplate: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      smsTemplate: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      document: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      scheduledMassSMS: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      massEmail: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      scheduledMassEmail: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      quote: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      invoice: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      billingTemplate: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      product: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      productCategory: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      inventoryproducts: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      },
      inventoryOfflineOrder: {
        user: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        },
        admin: {
          ...otherFilter,
          company: ObjectId(currentUser.company)
        }
      }
    }

    let query = queryObj?.[model]?.[currentUser.role] || {}

    const { query: updatedQuery, sort } = (() => {
      switch (model) {
        case 'company':
          return getFilterCompanyQuery({ filters: otherFilter })

        case 'user':
          return getFilterUserQuery({ filters: otherFilter, currentUser })

        case 'contact': {
          return getFilterContactsQuery({ filters: otherFilter, currentUser })
        }

        case 'document':
          return getFilterDocumentsQuery({ filters: otherFilter, currentUser })

        case 'form':
          return getFilterFormsQuery({ filters: otherFilter, currentUser })

        case 'emailTemplate':
          return getFilterEmailTemplatesQuery({ filters: otherFilter, currentUser })

        case 'smsTemplate':
          return getFilterSmsTemplatesQuery({ filters: otherFilter, currentUser })

        case 'inventoryproducts':
          return getFilterProductQuery({ filters: otherFilter, currentUser })

        case 'inventoryOfflineOrder':
          return getFilterOrdersQuery({ filters: otherFilter, currentUser })

        case 'notes':
          return getFilterNoteQuery({ filters: otherFilter })

        default:
          return { query: {}, sort: { createdAt: -1 } }
      }
    })()
    // =====================================

    query = Object.keys(query).reduce(
      (prevObj, key) => ({
        ...prevObj,
        [key]: query[key] === 'true' ? true : query[key] === 'false' ? false : query[key]
      }),
      {}
    )

    if (model === 'task') {
      if (query.completed || query.open) {
        query = { ...query, completed: query.completed || false }
      }
    }

    // ======================================

    const fileUrl = await exportDataHelper({
      model,
      query: updatedQueryModals.includes(model) ? updatedQuery : query,
      fileName,
      sort
    })
    return generalResponse(res, fileUrl, '', 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const changePosition = async (req, res) => {
  try {
    const { model, items, customPipelineId } = req.body
    const result = await updateMultiplePositions({ collectionName: model, items, customPipelineId })
    return generalResponse(res, !!result.ok, null, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const resetPosition = async (req, res) => {
  try {
    const companies = await findCompany()

    for (const company of companies) {
      const groups = await findAllGroups({ company: company._id }, null, { createdAt: -1 })
      await updateMultiplePositions({
        collectionName: 'group',
        items: groups.map((grp, ind) => ({ _id: grp._id, position: ind + 1 }))
      })

      for (const group of groups) {
        const status = await findAllStatus(
          { company: company._id, groupId: group._id ? group._id : null },
          { createdAt: -1 }
        )
        await updateMultiplePositions({
          collectionName: 'status',
          items: status.map((sts, ind) => ({ _id: sts._id, position: ind + 1 }))
        })

        const categories = await findAllCategory(
          { company: company._id, groupId: group._id ? group._id : null },
          { createdAt: -1 }
        )
        await updateMultiplePositions({
          collectionName: 'category',
          items: categories.map((ctg, ind) => ({ _id: ctg._id, position: ind + 1 }))
        })
        console.log('categories', categories.length)

        const tags = await findAllTags(
          { company: company._id, groupId: group._id ? group._id : null },
          { createdAt: -1 }
        )
        console.log('tags', tags.length)
        await updateMultiplePositions({
          collectionName: 'tag',
          items: tags.map((tag, ind) => ({ _id: tag._id, position: ind + 1 }))
        })

        const customFields = await findAllCustomField(
          { company: company._id, groupId: group._id ? group._id : null },
          { createdAt: -1 }
        )
        console.log('customeFields', customFields.length)
        await updateMultiplePositions({
          collectionName: 'customField',
          items: customFields.map((tag, ind) => ({ _id: tag._id, position: ind + 1 }))
        })
      }
    }
    return generalResponse(res, true, null, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const exportTaskData = async (req, res) => {
  try {
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
    } = req.body
    sort = parseData(sort)

    status = parseData(status)
    priority = parseData(priority)
    category = parseData(category)

    let subTaskFilter = []

    let match = {}
    // for search

    if (search) {
      const reg = new RegExp(search, 'i')
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

    // -----------------------------
    // if (parent_task === '') {
    //   match.parent_task = null
    // }
    // -----------------------------

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
      let $or = []
      if (_.isArray(priority) && priority.length) {
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
      }
      if (_.isArray(status) && status.length) {
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
      }
      if ($or?.length) {
        subTaskFilter = { $or }
      }

      $or = []
      if (_.isArray(priority) && priority.length) {
        $or.push({
          $or: [
            {
              'sub_tasks.priority': {
                $in: priority.map((value) => {
                  if (value === 'unassigned') {
                    return null
                  }
                  return ObjectId(value)
                })
              }
            },
            {
              priority: {
                $in: priority.map((value) => {
                  if (value === 'unassigned') {
                    return null
                  }
                  return ObjectId(value)
                })
              }
            }
          ]
        })
      }
      if (_.isArray(status) && status.length) {
        $or.push({
          $or: [
            {
              'sub_tasks.status': {
                $in: status.map((value) => {
                  if (value === 'unassigned') {
                    return null
                  }
                  return ObjectId(value)
                })
              }
            },
            {
              status: {
                $in: status.map((value) => {
                  if (value === 'unassigned') {
                    return null
                  }
                  return ObjectId(value)
                })
              }
            }
          ]
        })
      }
      if (_.isArray(match.$and)) {
        if ($or?.length) {
          match = { ...match, $and: [...(match?.$and || []), { $or }] }
        }
      } else {
        match = { ...match, ...($or?.length && { $or }) }
      }
    }
    // ============================

    if (assigned && !_.isArray(assigned)) {
      const tempAssigned = {
        $or: [{ assigned: ObjectId(assigned) }, { 'sub_tasks.assigned': ObjectId(assigned) }]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { assigned: ObjectId(assigned) }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempAssigned] }
    }
    if (frequency) {
      const tempFrequency = {
        $or: [{ frequency }, { 'sub_tasks.frequency': frequency }]
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
        $or: [{ contact: ObjectId(contact) }, { 'sub_tasks.contact': ObjectId(contact) }]
      }
      subTaskFilter = {
        ...subTaskFilter,
        $and: [...(subTaskFilter?.$and || []), { contact: ObjectId(contact) }]
      }
      match = { ...match, $and: [...(match?.$and || []), tempContact] }
    }

    if (category?.length) {
      const tempcategory = {
        $or: [
          { category: { $in: category.map((value) => ObjectId(value)) } },
          { 'sub_tasks.category': { $in: category.map((value) => ObjectId(value)) } }
        ]
      }
      // subTaskFilter = {
      //   ...subTaskFilter,
      //   $and: [...(subTaskFilter?.$and || []), { category: { $in: category.map((value) => ObjectId(value)) } }]
      // }
      match = { ...match, $and: [...(match?.$and || []), tempcategory] }
    }

    if (completed || open) {
      match = { ...match, completed: completed === true }
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

    match = { ...match, company: ObjectId(company), trash }

    const fileUrl = await exportTaskDataHelper({
      model: 'task',
      query: req.query,
      fileName: req.query.fileName,
      match,
      sort,
      subTaskFilter,
      groupFilter: {
        group,
        groupStatus,
        groupCategory,
        tags,
        pipeline,
        pipelineStage
      },
      snoozeDetailMatch: { ...snoozeTaskFilter },
      currentUserId: currentUser._id
    })
    return generalResponse(res, fileUrl, '', 'success')
  } catch (error) {
    console.log({ error })
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateReportProblem = async (req, res) => {
  try {
    let tempReportProblems = await ReportProblem.find()
    const bulkUpdate = []
    tempReportProblems = tempReportProblems.map((report) => {
      const files = []
      if (report.uploadFileURL?.length) {
        report.uploadFileURL.foreach((individualFile) => {
          const tempValue = JSON.parse(JSON.stringify(individualFile))
          delete tempValue.fileUrl
          delete tempValue.fileName
          delete tempValue._id
          if (Object.keys(tempValue)?.length > 1) {
            const obj = {}
            obj.fileName = Object.values(tempValue).join('')
            obj.fileUrl = Object.values(tempValue).join('')
            files.push(obj)
          }
        })
      }
      report.uploadFileURL = files
      bulkUpdate.push({
        updateOne: {
          filter: { _id: report._id },
          update: { $set: { uploadFileURL: files } }
        }
      })
      return report
    })
    await ReportProblem.bulkWrite(bulkUpdate)
    res.send(tempReportProblems)
  } catch (error) {
    console.log('Error:updateReportProblem', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const emit = (req, res) => {
  try {
    const { eventName, eventData, userId } = req.body
    if (userId) {
      io.to(userId).emit?.(eventName, eventData)
    } else {
      io.emit?.(eventName, eventData)
    }
    return generalResponse(res, null, '', 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
