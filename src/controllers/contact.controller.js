/* eslint-disable array-callback-return */
import generalResponse from '../helpers/generalResponse.helper'
import {
  createBillingContact,
  createContact,
  deleteBillingContact,
  deleteContact,
  findAllContact,
  findAllContactWithAggregate,
  findContact,
  findContactPopulate,
  findContactProjecttion,
  getContactsWithAggregate,
  getContactsWithRsvp,
  getCountContact,
  getStageContactsAggregate,
  getSelectedContactsWithFilters,
  updateContactAPI,
  updateManyContactAPI,
  updateMultipleContact,
  generateOrConditionsForStageContacts,
  findAllContactWithPagination
} from '../repositories/contact.repository'
import { ObjectId } from 'mongodb'
import moment from 'moment'
import pkg from 'lodash'
import { createStatus, findStatus } from '../repositories/status.repository'
import { createCategory, findCategory } from '../repositories/category.repository'
import { findForms, updateForm } from '../repositories/forms.repository'
import { findUser, updateUser } from '../repositories/users.repository'
import ejs from 'ejs'
import path from 'path'
import { sendMail } from '../services/send-grid'
import { findOneCompany } from '../repositories/companies.repository'
import reader from 'xlsx'
import { compareArraysByKey, convertEmptyObjValueToNull, parseData, removeFile } from '../utils/utils'
import { createGroup, findGroup } from '../repositories/groups.repository'
import { createTag, findTag } from '../repositories/tags.repository'
import { customParse, getSelectParams } from '../helpers/generalHelper'
import { findQuote } from '../repositories/quote.repository'
import { findInvoice } from '../repositories/invoice.repository'
import { Contacts } from '../models/contacts'
import { createPipeline, findPipeline, updatePipeline } from '../repositories/pipeline.repository'
import mongoose from 'mongoose'
import { createImportContactsJob } from '../repositories/imported-contacts-jobs.repository'
import { IMPORT_CONTACTS_STATUS } from '../models/import-contacts-job'
import { isValidateEmail } from '../helpers/contact.helper'
import { createBulkImportContacts } from '../repositories/imported-contacts.repository'
import { createChangeContactsGroupSchedulerJob } from '../schedular-jobs/bulk-change-group/changeContactsGroupJobSchedulerQueue.helper'
import { findScheduledMassEmail } from '../repositories/scheduledMassEmail'
import { Permission } from '../models/permission'
import { createContactActivity } from '../repositories/contactActivities'
import { AVAILABLE_ACTIVITY_FOR, AVAILABLE_EVENT_TYPE } from '../models/contact-activity'
import { findMassEmail } from '../repositories/massEmail.repository'

const { isEqual, isArray } = pkg
const { isObjectIdOrHexString } = mongoose

export const createContactDetail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const body = convertEmptyObjValueToNull(req.body)

    if (!body.firstName) {
      return generalResponse(res, null, { text: 'Name is required.' }, 'error', false, 400)
    }

    if (body.email) {
      const isExist = await findContact({ email: body.email, company: ObjectId(currentUser.company) })
      if (isExist) {
        return generalResponse(res, null, { text: 'Contact already exists.' }, 'error', false, 400)
      }
    }

    if (body?.pipelineDetails && body?.pipelineDetails.length > 0) {
      body?.pipelineDetails.forEach((company) => {
        const contactNote = []
        if (company.notes && company.notes.length > 0) {
          company.notes.forEach((note) => {
            const obj = {}
            obj.userId = currentUser._id
            obj.text = note.text
            obj.createdAt = note?.createdAt
            contactNote.push(obj)
          })
          company.notes = contactNote
        }
      })
    }

    if (isArray(body.tags)) {
      body.tags = body.tags.map((obj) => obj.id)
    } else {
      body.tags = null
    }
    if (!body.status) {
      body.tags = null
    }

    let bill = null
    if (body.enableBilling) {
      bill = await createBillingContact(body)
    }

    const contact = await createContact({ ...body, billingCustomerId: bill?.id ? bill.id : null })

    if (contact?._id) {
      await createContactActivity({
        eventType: AVAILABLE_EVENT_TYPE.NEW_CONTACT_CREATE_FROM_CONTACT_FORM,
        contact: contact?._id,
        eventFor: AVAILABLE_ACTIVITY_FOR.contact,
        refId: contact?._id,
        company: ObjectId(currentUser.company),
        createdBy: ObjectId(currentUser._id)
      })
    }
    return generalResponse(res, contact, 'Contact Save Successfully!')
  } catch (error) {
    console.log('error', error?.message)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getFilteredContacts = async (req, res) => {
  const itemsPerPage = Number(req.query.limit) || 10
  const page = req.query.page || 1
  const search = req.query.search || ''
  const archived = req.query.archived
  const reg = new RegExp(search, 'i')

  const currentUser = req.headers.authorization
  let where = { company: ObjectId(currentUser.company), ...(archived != null ? { archived: archived === 'true' } : {}) }
  if (search) {
    where = {
      ...where,
      $or: [
        { firstName: { $regex: reg } },
        { lastName: { $regex: reg } },
        { fullName: { $regex: reg } },
        { email: { $regex: reg } },
        { company_name: { $regex: reg } },
        { website: { $regex: reg } },
        { phone: { $regex: reg } }
      ]
    }
  }

  const selectedFields = getSelectParams(req)
  const contacts = await Contacts.aggregate([
    {
      $addFields: {
        fullName: {
          $concat: ['$firstName', ' ', '$lastName']
        }
      }
    },
    {
      $match: {
        ...where
      }
    },
    {
      $project: {
        ...selectedFields
      }
    },
    {
      $facet: {
        totalCount: [
          {
            $count: 'totalTask'
          }
        ],
        tasksDetails: [
          {
            $skip: itemsPerPage * page - itemsPerPage
          },
          {
            $limit: itemsPerPage
          }
        ]
      }
    },
    {
      $unwind: {
        path: '$totalCount',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        total: '$totalCount.totalTask',
        allContacts: '$tasksDetails'
      }
    }
  ])

  return generalResponse(
    res,
    { total: contacts?.[0]?.total || 0, allContacts: contacts?.[0]?.allContacts || [] },
    'success'
  )
}

export const getContactDetails = async (req, res) => {
  try {
    const { withRelationalData = true } = req.query
    if (req.query?.tags === 'null') {
      req.query.tags = []
      delete req.query?.tags
      req.query.$or = [{ tags: null }, { tags: { $exists: true, $size: 0 } }]
    }

    if ('group.id' in req.query) {
      req.query['group.id'] = req.query['group.id'] || null
    }

    if (req.query['group.id'] === 'unAssigned') {
      req.query.group = null
      delete req.query['group.id']
    }

    const contact = await findAllContact(
      req.query,
      getSelectParams(req),
      { createdAt: -1 },
      withRelationalData === true
        ? [
            { path: 'group.id', ref: 'Groups' },
            { path: 'status.id', ref: 'Status' },
            { path: 'company', select: 'name' }
          ]
        : undefined
    )
    return generalResponse(res, contact, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getContactsNotInStage = async (req, res) => {
  try {
    const select = getSelectParams(req)
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const obj = {
      company: ObjectId(currentUser.company),
      archived: false
    }
    const search = req.query.search || ''
    const reg = new RegExp(search, 'i')

    if (search) {
      obj.$or = [{ firstName: { $regex: reg } }, { lastName: { $regex: reg } }, { email: { $regex: reg } }]
    }

    if (req.query.group === 'unAssigned') {
      obj.group = null
    } else if (req.query.group) {
      obj['group.id'] = ObjectId(req.query.group)
      delete obj.group
    }
    if (req.query.notInStage) {
      // to get list of contacts that are not in any particular stage
      const stageKey = req.query.stageKey
      const notInStage = req.query.notInStage
      if (notInStage === 'unassignedItem' || notInStage === 'unAssigned') {
        obj[stageKey] = { $ne: null }
      } else {
        const key = stageKey === 'pipeline' ? 'pipelineDetails.status' : stageKey
        obj[`${key}.id`] = { $ne: ObjectId(notInStage) }
      }
    }
    const skip = (req.query.page - 1) * req.query.limit

    const [contacts, total] = await findAllContactWithPagination(
      obj,
      select,
      { createdAt: -1 },
      skip,
      Number(req.query.limit) || 10
    )
    return generalResponse(res, { contacts, total }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getContacts = async (req, res) => {
  try {
    const data = await getContactsWithAggregate(req)
    return generalResponse(res, data, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getStageContacts = async (req, res) => {
  try {
    const { aggregateOn } = req.query
    const currentUser = req.headers.authorization

    const match = {
      ...(req.query.group ? { 'group.id': ObjectId(req.query.group) } : aggregateOn === 'group' ? {} : { group: null }),
      ...(req.query.customPipeline ? { 'pipelineDetails.pipeline.id': ObjectId(req.query.customPipeline) } : {}),
      company: currentUser.company,
      archived: false
    }

    const stages = req.query.stages.split(',')

    match.$or = generateOrConditionsForStageContacts(
      stages,
      aggregateOn === 'pipeline' ? 'pipelineDetails.status' : aggregateOn,
      aggregateOn === 'group' ? 'unAssigned' : 'unassignedItem'
    )

    const data = await getStageContactsAggregate({
      match,
      pageNumber: req.query.page || 1,
      limit: req.query.limit * 1 || 10,
      aggregateOn
    })
    return generalResponse(res, data, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getContactsForMassEmail = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const keyFields = ['status', 'category']
    // const keyFields = ['group', 'status', 'category']
    const arrayKeyFields = ['tags', 'group']
    const pipelineFilter = {
      pipeline: 'pipelineDetails.pipeline.id',
      stage: 'pipelineDetails.status.id'
    }
    let { filters = {}, massTemplate } = req.query

    const obj = {}

    const search = req.query.search || ''
    const reg = new RegExp(search, 'i')

    if (search) {
      obj.$or = [{ firstName: { $regex: reg } }, { lastName: { $regex: reg } }, { email: { $regex: reg } }]
    }

    filters = parseData(filters)

    if (filters && Object.keys(filters)?.length) {
      Object.keys(filters).forEach((key) => {
        if (keyFields.includes(key)) {
          if (filters[key] === 'UnassignedItem') {
            obj[key] = null
          }
          if (ObjectId.isValid(filters[key])) {
            obj[`${key}.id`] = ObjectId(filters[key])
          }
        }

        if (arrayKeyFields.includes(key) && filters[key]?.length) {
          // obj[key] = {
          //   $in: filters[key].map((value) =>
          //     value === 'UnassignedItem' ? null : isObjectIdOrHexString(value) ? mongoose.Types.ObjectId(value) : value
          //   )
          // }
          if (key === 'group') {
            if (filters[key].includes('UnassignedItem')) {
              obj.$or = [
                {
                  'group.id': {
                    $in: filters[key]
                      .map((value) => {
                        if (value !== 'UnassignedItem') {
                          return isObjectIdOrHexString(value) ? mongoose.Types.ObjectId(value) : value
                        }
                      })
                      .filter((el) => el)
                  }
                },
                {
                  group: null
                }
              ]
            } else {
              obj['group.id'] = {
                $in: filters[key].map((value) =>
                  isObjectIdOrHexString(value) ? mongoose.Types.ObjectId(value) : value
                )
              }
            }
          } else {
            obj[key] = {
              $in: filters[key].map((value) => {
                if (value === 'UnassignedItem') {
                  return null
                } else {
                  return isObjectIdOrHexString(value) ? mongoose.Types.ObjectId(value) : value
                }
              })
            }
          }
        }
        if (pipelineFilter[key]) {
          if (filters[key] === 'UnassignedItem') {
            // obj[key] = key === 'pipeline' ? [] : null
            obj.pipelineDetails = key === 'pipeline' ? [] : null
          }
          if (ObjectId.isValid(filters[key])) {
            obj[pipelineFilter[key]] = ObjectId(filters[key])
          }
        }
      })
    }

    obj.company = ObjectId(currentUser.company)

    const page = req.query.page * 1 || 1
    const limit = req.query.limit * 1 || 10
    const skip = limit * (page - 1)

    const massEmail = await findMassEmail({ _id: massTemplate })

    let allContacts = []

    if (massEmail?.contacts.length) {
      const massEmailContacts = await findAllContact(
        { ...obj, _id: { $in: massEmail?.contacts || [] }, archived: false, email: { $ne: null } },
        getSelectParams(req)
      )
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
      allContacts = [...massEmailContacts]
    }

    const remainingLimit = limit - allContacts.length

    if (remainingLimit) {
      const results = await findAllContact(
        { ...obj, _id: { $nin: massEmail?.contacts || [] }, archived: false, email: { $ne: null } },
        getSelectParams(req)
      )
        .sort({ _id: -1 })
        .skip(skip)
        .limit(remainingLimit)
      allContacts = [...allContacts, ...results]
    }

    const total = await getCountContact({ ...obj, archived: false, email: { $ne: null } })
    const unsSubscribedCount = await getCountContact({
      ...obj,
      archived: false,
      email: { $ne: null },
      hasUnsubscribed: true
    })

    return generalResponse(res, { results: allContacts, total, unsSubscribedCount }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getContactsForCloneMassEmail = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const keyFields = ['status', 'category']
    const arrayKeyFields = ['tags', 'group']
    const pipelineFilter = {
      pipeline: 'pipelineDetails.pipeline.id',
      stage: 'pipelineDetails.status.id'
    }
    let { filters = {}, cloneMailBlastId } = req.query

    const obj = {}

    const search = req.query.search || ''
    const reg = new RegExp(search, 'i')

    if (search) {
      obj.$or = [{ firstName: { $regex: reg } }, { lastName: { $regex: reg } }, { email: { $regex: reg } }]
    }

    filters = parseData(filters)

    if (filters && Object.keys(filters)?.length) {
      Object.keys(filters).forEach((key) => {
        if (keyFields.includes(key)) {
          if (filters[key] === 'UnassignedItem') {
            obj[key] = null
          }
          if (ObjectId.isValid(filters[key])) {
            obj[`${key}.id`] = ObjectId(filters[key])
          }
        }

        if (arrayKeyFields.includes(key) && filters[key]?.length) {
          // obj[key] = {
          //   $in: filters[key].map((value) =>
          //     value === 'UnassignedItem' ? null : isObjectIdOrHexString(value) ? mongoose.Types.ObjectId(value) : value
          //   )
          // }
          if (key === 'group') {
            if (filters[key].includes('UnassignedItem')) {
              obj.$or = [
                {
                  'group.id': {
                    $in: filters[key]
                      .map((value) => {
                        if (value !== 'UnassignedItem') {
                          return isObjectIdOrHexString(value) ? mongoose.Types.ObjectId(value) : value
                        }
                      })
                      .filter((el) => el)
                  }
                },
                {
                  group: null
                }
              ]
            } else {
              obj['group.id'] = {
                $in: filters[key].map((value) =>
                  isObjectIdOrHexString(value) ? mongoose.Types.ObjectId(value) : value
                )
              }
            }
          } else {
            obj[key] = {
              $in: filters[key].map((value) => {
                if (value === 'UnassignedItem') {
                  return null
                } else {
                  return isObjectIdOrHexString(value) ? mongoose.Types.ObjectId(value) : value
                }
              })
            }
          }
        }
        if (pipelineFilter[key]) {
          if (filters[key] === 'UnassignedItem') {
            obj.pipelineDetails = key === 'pipeline' ? [] : null
          }
          if (ObjectId.isValid(filters[key])) {
            obj[pipelineFilter[key]] = ObjectId(filters[key])
          }
        }
      })
    }

    const scheduleMassEmailData = await findScheduledMassEmail({ _id: ObjectId(cloneMailBlastId) }).select({
      contacts: true
    })

    obj.company = ObjectId(currentUser.company)

    const page = req.query.page * 1 || 1
    const limit = req.query.limit * 1 || 10
    const skip = limit * (page - 1)

    const results = await findAllContactWithAggregate([
      {
        $match: {
          ...obj,
          archived: false,
          email: { $ne: null }
          // Commented due to get specific search
          // $or: [{ _id: { $in: scheduleMassEmailData.contacts } }, { _id: { $nin: scheduleMassEmailData.contacts } }]
        }
      },
      {
        $addFields: {
          sortField: {
            $cond: {
              if: { $in: ['$_id', scheduleMassEmailData.contacts] },
              then: '$_id',
              else: null
            }
          }
        }
      },
      {
        $sort: { sortField: -1, _id: 1 }
      },
      {
        $project: { _id: 1, firstName: 1, lastName: 1, email: 1, group: 1, hasUnsubscribed: 1 }
      },
      { $skip: skip },
      { $limit: limit }
    ])
    // .sort({ _id: { $in: scheduleMassEmailData.contacts } ? 1 : -1 })
    // .skip(skip)
    // .limit(limit)
    const total = await getCountContact({ ...obj, email: { $ne: null }, archived: false })
    const unsSubscribedCount = await getCountContact({ ...obj, hasUnsubscribed: true })

    return generalResponse(res, { results, total, unsSubscribedCount }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSelectedContactsForMassEmail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { filters } = req.query

    const contactFilters = parseData(filters)

    const { is_all_selected, selected_contacts } = contactFilters || {}

    const selectQ = {}
    const select = contactFilters.select
    if (select) {
      const projectField = select.split(',')
      if (projectField && projectField.length > 0) {
        projectField.forEach((field) => {
          selectQ[field] = 1
        })
      }
    }

    if (is_all_selected) {
      const filters = { ...contactFilters, company: currentUser?.company, email: { $ne: null }, select: selectQ }

      const { contacts, total } = await getSelectedContactsWithFilters(filters, true)
      return generalResponse(res, { results: contacts, total }, 'success')
    }

    const page = +(contactFilters.page || 1) * 1
    const limit = +(contactFilters.limit || 10) * 1
    const skip = limit * (page - 1)

    const where = { _id: { $in: selected_contacts.map((c) => ObjectId(c)) } }

    const search = contactFilters.search || ''
    const reg = new RegExp(search, 'i')

    if (search) {
      where.$or = [
        { firstName: { $regex: reg } },
        { lastName: { $regex: reg } },
        { company_name: { $regex: reg } },
        { email: { $regex: reg } }
      ]
    }

    const contacts = await Contacts.find(where, selectQ).limit(limit).skip(skip).sort(customParse(contactFilters.sort))
    const total = await getCountContact(where)

    return generalResponse(res, { results: contacts, total }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getContactWithRsvp = async (req, res) => {
  try {
    const contact = await getContactsWithRsvp(req.query.company, req.query.eventId)
    return generalResponse(res, contact, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificContact = async (req, res) => {
  try {
    const populateAll = req.query.populateAll !== 'false'
    let contact = await findContactPopulate(
      { _id: req.params.id },
      populateAll
        ? [
            { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
            { path: 'pipelineDetails.statusHistory.changedBy' },
            { path: 'groupHistory.changedBy', ref: 'User' },
            { path: 'group.id', ref: 'Groups' },
            { path: 'status.id', ref: 'Status' },
            { path: 'statusHistory.changedBy' },
            { path: 'pipelineHistory.changedBy' },
            { path: 'categoryHistory.changedBy' },
            { path: 'category.id', ref: 'Category' },
            { path: 'tags', ref: 'Tags' },
            { path: 'userId', ref: 'Users', select: { active: 1 } },
            { path: 'tagsHistory.changedBy' },
            { path: 'groupHistory.group.id' }
          ]
        : [],
      getSelectParams(req)
    )

    /* Check billing status */
    let canUpdateBillingStatus = true

    const isInQuote = await findQuote({ customer: req.params.id })
    const isInInvoice = await findInvoice({ customer: req.params.id })

    if ((isInQuote || isInInvoice) && contact) {
      canUpdateBillingStatus = false
      contact = { ...JSON.parse(JSON.stringify(contact)), canUpdateBillingStatus }
    }

    return generalResponse(res, contact, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getBillingProfiles = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const contacts = await findAllContact(
      { company: ObjectId(currentUser.company), enableBilling: true },
      getSelectParams(req),
      { createdAt: -1 },
      [
        { path: 'group.id', ref: 'Groups' },
        { path: 'status.id', ref: 'Status' },
        { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
        { path: 'pipelineDetails.statusHistory.changedBy' },
        { path: 'category.id', ref: 'Category' },
        { path: 'tags', ref: 'Tags' }
      ]
    )
    return generalResponse(res, contacts, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateContactStatus = async (req, res) => {
  try {
    const oldContactObj = await findContactPopulate({ _id: req.params.id }, [
      { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
      { path: 'pipelineDetails.statusHistory.changedBy' },
      { path: 'groupHistory.changedBy', ref: 'User' },
      { path: 'group.id', ref: 'Groups' },
      { path: 'status.id', ref: 'Status' },
      { path: 'category.id', ref: 'Category' },
      { path: 'tags', ref: 'Tags' }
    ])

    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (oldContactObj && oldContactObj.pipelineDetails && oldContactObj.pipelineDetails.length > 0) {
      oldContactObj.pipelineDetails.forEach((pipeline) => {
        if (pipeline._id.equals(req.body._id)) {
          if (req.body.updateField === 'pipelineStatus' && !pipeline.status.id.equals(req.body.status.id)) {
            const stages = pipeline?.pipeline?.id?.stages.find((stage) => stage._id.equals(pipeline?.status?.id))
            pipeline.statusHistory.push({ status: stages, note: req.body?.note, changedBy: currentUser._id })
            pipeline.status = req.body.status
          } else if (req.body.updateField === 'dashboardStatusUpdate') {
            if (!pipeline.status.id.equals(req.body.status.id)) {
              const stages = pipeline?.pipeline?.id?.stages.find((stage) => stage._id.equals(pipeline?.status?.id))
              pipeline.statusHistory.push({ status: stages, note: req.body?.note, changedBy: currentUser._id })
              pipeline.status = req.body.status
            }
          }
        }
      })
    }

    delete oldContactObj._id
    await updateContactAPI({ _id: req.params.id }, oldContactObj)
    const latestContact = await findContactPopulate({ _id: req.params.id }, [
      { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
      { path: 'pipelineDetails.statusHistory.changedBy' },
      { path: 'groupHistory.changedBy', ref: 'User' },
      { path: 'group.id', ref: 'Groups' },
      { path: 'status.id', ref: 'Status' },
      { path: 'category.id', ref: 'Category' },
      { path: 'tags', ref: 'Tags' }
    ])

    let selectedLodgeDetail

    if (req?.body?.updateField === 'pipelineStatus') {
      selectedLodgeDetail = latestContact.pipelineDetails.find((pipeline) => pipeline._id.equals(req.body._id))
    } else {
      latestContact.companyDetails?.forEach((company) => {
        if (company._id.equals(req.body._id)) {
          selectedLodgeDetail = company
        }
      })
    }

    return generalResponse(res, selectedLodgeDetail, 'Contact Updated Successfully')
  } catch (error) {
    console.log('error : ', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateContact = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const latestContactObj = req.body
    const oldContactObj = await findContactPopulate({ _id: req.params.id }, [
      { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
      { path: 'pipelineDetails.statusHistory.changedBy' },
      { path: 'groupHistory.changedBy', ref: 'User' },
      { path: 'pipelineHistory.changedBy', ref: 'User' },
      { path: 'group.id', ref: 'Groups' },
      { path: 'status.id', ref: 'Status' },
      { path: 'category.id', ref: 'Category' },
      { path: 'tags', ref: 'Tags' }
    ])

    const hasOldGroup = oldContactObj?.group !== null
    const isLatestGroupUnassigned = latestContactObj?.group?.id === 'unAssigned'
    const latestGroupId = latestContactObj?.group?.id

    if (
      (hasOldGroup &&
        (isLatestGroupUnassigned || (latestGroupId && !oldContactObj?.group?.id?.equals(ObjectId(latestGroupId))))) ||
      (!hasOldGroup && !isLatestGroupUnassigned)
    ) {
      if (!latestContactObj.groupHistory) {
        latestContactObj.groupHistory = oldContactObj.groupHistory
      }
      const tags = []
      if (oldContactObj?.tags) {
        oldContactObj?.tags.forEach((tag) => {
          tags.push({ id: tag._id, code: tag.tagId, title: tag.tagName })
        })
      }
      // REMOVED TO HAVE OLD DETAILED OBJECT - HANDLE GROUP CHANGE HISTORY
      // if (oldContactObj && oldContactObj.pipelineDetails && oldContactObj.pipelineDetails.length > 0) {
      //   oldContactObj?.pipelineDetails.map((pipeline) => {
      //     if (pipeline.pipeline) {
      //       const id = pipeline?.pipeline?.id?._id
      //       pipeline.pipeline.id = id
      //     }
      //     if (pipeline.status) {
      //       const id = pipeline?.status?.id?._id
      //       pipeline.status.id = id
      //     }
      //   })
      // }

      latestContactObj.groupHistory.push({
        changedBy: currentUser._id,
        status: {
          id: oldContactObj?.status?.id?._id ? oldContactObj?.status?.id?._id : null,
          code: oldContactObj?.status?.id?.statusCode ? oldContactObj?.status?.id?.statusCode : null,
          title: oldContactObj?.status?.id?.statusName ? oldContactObj?.status?.id?.statusName : null
        },
        statusHistory: oldContactObj.statusHistory,
        category: {
          id: oldContactObj?.category?.id?._id ? oldContactObj?.category?.id?._id : null,
          code: oldContactObj?.category?.id?.categoryId ? oldContactObj?.category?.id?.categoryId : null,
          title: oldContactObj?.category?.id?.categoryName ? oldContactObj?.category?.id?.categoryName : null
        },
        categoryHistory: oldContactObj.categoryHistory,
        tags,
        tagsHistory: oldContactObj?.tagsHistory,
        pipelineDetails: oldContactObj.pipelineDetails,
        pipelineHistory: oldContactObj.pipelineHistory,
        questions: oldContactObj.questions,
        group: {
          id: oldContactObj?.group?.id?._id ? oldContactObj?.group?.id?._id : null,
          code: oldContactObj?.group?.id?.groupCode ? oldContactObj?.group?.id?.groupCode : null,
          title: oldContactObj?.group?.id?.groupName ? oldContactObj?.group?.id?.groupName : null
        }
      })
    }
    if (latestContactObj?.group?.id === 'unAssigned') {
      latestContactObj.group = null
    }

    // -----------status history---------->> start
    if (oldContactObj?.status !== null && !oldContactObj?.status?.id?.equals(latestContactObj?.status?.id)) {
      if (latestContactObj?.statusHistory) {
        const obj = {}
        obj.code = oldContactObj?.status?.id?.statusCode
        obj.title = oldContactObj?.status?.id?.statusName

        latestContactObj.statusHistory.push({
          changedBy: currentUser._id,
          status: obj,
          createdAt: moment().utc().toISOString()
        })
      }
    } else if (oldContactObj?.status === null && latestContactObj?.status?.id) {
      if (latestContactObj?.statusHistory) {
        const obj = {}
        obj.code = 'unassignedItem'
        obj.title = 'Unassigned'
        latestContactObj.statusHistory.push({
          changedBy: currentUser._id,
          status: obj,
          createdAt: moment().utc().toISOString()
        })
      }
    }
    // -----------status history---------->> end

    // -----------category history---------->> start
    if (oldContactObj?.category !== null && !oldContactObj?.category?.id.equals(latestContactObj?.category?.id)) {
      if (latestContactObj?.categoryHistory) {
        const obj = {}
        obj.code = oldContactObj?.category?.id?.categoryId
        obj.title = oldContactObj?.category?.id?.categoryName

        latestContactObj.categoryHistory.push({
          changedBy: currentUser._id,
          category: obj,
          createdAt: moment().utc().toISOString()
        })
      }
    } else if (oldContactObj?.category === null && latestContactObj?.category?.id) {
      if (latestContactObj?.categoryHistory) {
        const obj = {}
        obj.code = 'unassignedItem'
        obj.title = 'Unassigned'
        latestContactObj.categoryHistory.push({
          changedBy: currentUser._id,
          category: obj,
          createdAt: moment().utc().toISOString()
        })
      }
    }
    // -----------category history---------->> end

    // -----------tag history---------->> start
    let tempOldTagObjArray = []
    if (isArray(oldContactObj?.tags)) {
      tempOldTagObjArray = JSON.parse(JSON.stringify(oldContactObj?.tags))
    }
    if (tempOldTagObjArray?.length > 0) {
      const oldTagsIds = tempOldTagObjArray.map((obj) => obj._id) ?? []
      if (isArray(latestContactObj?.tags)) {
        const newTagsIds = latestContactObj?.tags?.map((obj) => obj._id) ?? []
        if (isArray(oldTagsIds) && isArray(newTagsIds) && !isEqual(oldTagsIds.sort(), newTagsIds.sort())) {
          latestContactObj.tagsHistory.push({
            changedBy: currentUser._id,
            tags: tempOldTagObjArray.map((obj) => ({ code: obj.tagId, title: obj.tagName })),
            createdAt: moment().utc().toISOString()
          })
        }
      }
    }
    // -----------tag history---------->> end

    // TODO CHECK
    if (latestContactObj.pipelineDetails && latestContactObj.pipelineDetails.length > 0) {
      latestContactObj.pipelineDetails.forEach((pipeline) => {
        const contactNote = []
        const oldUser = oldContactObj.pipelineDetails.find((oldLodge) => oldLodge._id.equals(pipeline._id))
        if (pipeline.notes && pipeline.notes.length > 0) {
          pipeline.notes.forEach((note) => {
            const obj = {}
            if (note && note.userId && note.userId._id) {
              obj.userId = note?.userId?._id
            } else {
              obj.userId = currentUser._id
            }
            obj.text = note.text
            obj.createdAt = note?.createdAt
            contactNote.push(obj)
          })
          pipeline.notes = contactNote
        }
        if (!oldUser?.status?.id.equals(pipeline?.status?.id)) {
          if (!pipeline.statusHistory && !oldUser?.statusHistory) {
            pipeline.statusHistory = []
          } else {
            const stages = oldUser?.pipeline?.id?.stages?.find((stage) => stage._id.equals(oldUser?.status?.id))

            pipeline.statusHistory = [...(oldUser?.statusHistory || [])]

            pipeline.statusHistory.push({
              status: stages,
              changedBy: currentUser._id,
              createdAt: moment().utc().toISOString()
            })
          }
        }
      })
    }
    const hasDifferenceInPipeline = compareArraysByKey(
      (latestContactObj.pipelineDetails || []).map((el) => el.pipeline.id),
      oldContactObj.pipelineDetails.map((el) => el.pipeline.id._id?.toString())
    )
    if (hasDifferenceInPipeline) {
      latestContactObj.pipelineHistory = oldContactObj.pipelineHistory || []
      latestContactObj.pipelineHistory.push({
        changedBy: currentUser._id,
        pipelines: oldContactObj.pipelineDetails.map((pipelineObj) => {
          return {
            code: pipelineObj.pipeline.id.pipelineCode,
            title: pipelineObj.pipeline.id.pipelineName
          }
        })
      })
    }
    // TODO CHECK
    if (isArray(latestContactObj.tags)) {
      latestContactObj.tags = latestContactObj.tags.map((obj) => obj.id)
    }

    let billingId = oldContactObj?.billingCustomerId
    if (req.body.enableBilling === false && billingId) {
      await deleteBillingContact(billingId)
      billingId = null
    }

    if (req.body.enableBilling === true && !billingId) {
      const bill = await createBillingContact(req.body)
      billingId = bill?.id ? bill?.id : null
    }

    await updateContactAPI(
      { _id: req.params.id, company: ObjectId(currentUser.company) },
      { ...latestContactObj, billingCustomerId: billingId }
    )

    const contact = await findContactProjecttion(
      { _id: req.params.id },
      { groupHistory: 1, statusHistory: 1, categoryHistory: 1, tagsHistory: 1, pipelineDetails: 1, pipelineHistory: 1 },
      [
        { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
        { path: 'pipelineDetails.statusHistory.changedBy' },
        { path: 'groupHistory.changedBy', ref: 'User' },
        { path: 'statusHistory.changedBy' },
        { path: 'categoryHistory.changedBy' },
        { path: 'pipelineHistory.changedBy' },
        { path: 'tagsHistory.changedBy' },
        { path: 'groupHistory.group.id' }
      ]
    )

    return generalResponse(res, contact, 'Contact updated successfully!')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const assignContactPipeline = async (req, res) => {
  try {
    const { userIds } = req.body
    if (userIds && userIds.length > 0) {
      const promises = []
      userIds.forEach((userId) => {
        promises.push(findContact({ _id: userId }))
      })
      Promise.all(promises)
        .then((users) => {
          const updateContacts = []
          users.forEach((user) => {
            const obj = {}
            obj.pipeline = req.body.pipeline
            obj.status = req.body.status
            obj.note = []
            obj.statusHistory = []
            user.pipelineDetails.push(obj)
            updateContacts.push(updateContactAPI({ _id: user._id }, user))
          })
          Promise.all(updateContacts)
            .then(() => {
              return generalResponse(res, null, 'success')
            })
            .catch((err) => {
              console.log({ err })
              return generalResponse(res, err, '', 'error', false, 400)
            })
        })
        .catch((err) => {
          console.log({ err })
          return generalResponse(res, err, '', 'error', false, 400)
        })
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const assignStages = async (req, res) => {
  try {
    const { contactIds, stageKey, stageId, customPipelineId } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const historyKeyMap = {
      status: { key: 'status', historyKey: 'statusHistory', codeKey: 'statusCode', nameKey: 'statusName' },
      category: { key: 'category', historyKey: 'categoryHistory', codeKey: 'categoryId', nameKey: 'categoryName' },
      group: { key: 'group', historyKey: 'groupHistory', codeKey: '', nameKey: '' },
      pipeline: { key: 'pipelineDetails.status' }
    }

    const tempContactObjArray = []

    const selectedKey = historyKeyMap[stageKey]

    for (const contactId of contactIds) {
      const contact = await findContact({ _id: contactId }).populate([
        { path: 'group', ref: 'Groups' },
        { path: 'category', ref: 'Categories' },
        { path: 'status', ref: 'Status' },
        { path: 'tags', ref: 'Tags' }
      ])

      let pipelineDetails = contact.pipelineDetails || []
      if (stageKey === 'pipeline' && customPipelineId) {
        const pipeline = await findPipeline({ _id: ObjectId(customPipelineId) })
        const pipelineStage = (pipeline?.stages || []).find((s) => s._id.toString() === stageId)

        if (pipeline && pipelineStage) {
          const newStageHistoryObj = { status: pipelineStage, changedBy: currentUser._id }

          if (pipelineDetails.find((p) => p.pipeline.id.toString() === customPipelineId.toString())) {
            pipelineDetails = [...pipelineDetails].map((p) => {
              const statusHistory = [...(p.statusHistory || []), newStageHistoryObj]
              return p.pipeline.id.toString() === customPipelineId.toString()
                ? { ...p, status: { id: stageId }, statusHistory }
                : p
            })
          } else {
            const newPipelineObj = {
              pipeline: { id: customPipelineId },
              status: { id: stageId },
              note: [],
              statusHistory: [newStageHistoryObj]
            }
            pipelineDetails = [...pipelineDetails, newPipelineObj]
          }
        }
      }

      const payload = {
        $set: {
          ...(selectedKey.historyKey && { [selectedKey.historyKey]: contact[selectedKey.historyKey] || [] }),
          ...(stageKey === 'pipeline'
            ? { pipelineDetails }
            : stageKey === 'group'
            ? { [selectedKey.key]: stageId === 'unAssigned' ? null : { id: ObjectId(stageId) } }
            : { [selectedKey.key]: stageId === 'unassignedItem' ? null : { id: ObjectId(stageId) } })
        }
      }

      if (selectedKey.historyKey) {
        const { historyKey, codeKey, nameKey } = historyKeyMap[stageKey]
        const oldStageValue = contact?.[stageKey]
        if (oldStageValue !== null && !oldStageValue?.id?.equals(stageId) && stageKey !== 'group') {
          const obj = {}
          obj.code = oldStageValue?.id?.[codeKey]
          obj.title = oldStageValue?.id?.[nameKey]
          payload.$set[historyKey].push({
            changedBy: currentUser._id,
            [stageKey]: obj
          })
        } else if (oldStageValue === null && stageId && stageKey !== 'group') {
          const obj = {}
          obj.code = 'unassignedItem'
          obj.title = 'Unassigned'
          payload.$set[historyKey].push({
            changedBy: currentUser._id,
            [stageKey]: obj
          })
        }

        if (stageKey === 'group') {
          const tags = []
          if (contact?.tags) {
            contact?.tags.forEach((tag) => {
              tags.push({ id: tag._id, code: tag.tagId, title: tag.tagName })
            })
          }
          if (contact && contact.pipelineDetails && contact.pipelineDetails.length > 0) {
            contact?.pipelineDetails.map((pipeline) => {
              if (pipeline.pipeline) {
                const id = pipeline?.pipeline?.id?._id
                pipeline.pipeline.id = id
              }
              if (pipeline.status) {
                const id = pipeline?.status?.id?._id
                pipeline.status.id = id
              }
            })
          }

          payload.$set[historyKey].push({
            changedBy: currentUser._id,
            status: {
              id: contact?.status?.id?._id ? contact?.status?.id?._id : null,
              code: contact?.status?.id?.statusCode ? contact?.status?.id?.statusCode : null,
              title: contact?.status?.id?.statusName ? contact?.status?.id?.statusName : null
            },
            statusHistory: contact.statusHistory,
            category: {
              id: contact?.category?.id?._id ? contact?.category?.id?._id : null,
              code: contact?.category?.id?.categoryId ? contact?.category?.id?.categoryId : null,
              title: contact?.category?.id?.categoryName ? contact?.category?.id?.categoryName : null
            },
            categoryHistory: contact.categoryHistory,
            tags,
            tagsHistory: contact?.tagsHistory,
            pipelineDetails: contact.pipelineDetails,
            questions: contact.questions,
            group: {
              id: contact?.group?.id?._id ? contact?.group?.id?._id : null,
              code: contact?.group?.id?.groupCode ? contact?.group?.id?.groupCode : null,
              title: contact?.group?.id?.groupName ? contact?.group?.id?.groupName : null
            }
          })
          payload.$set.statusHistory = []
          payload.$set.categoryHistory = []
          payload.$set.tagsHistory = []
        }
      }

      tempContactObjArray.push({
        updateOne: {
          filter: {
            _id: ObjectId(contactId)
          },
          update: payload
        }
      })
    }
    await updateMultipleContact(tempContactObjArray)
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateContactGroupDetails = (req, res) => {
  try {
    const details = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    if (details && details.group && details.group._id && details.forms && details.forms.length > 0) {
      details.forms.forEach(async (formId) => {
        const oldForm = await findForms({ _id: formId })

        oldForm.group.id = details.group._id
        oldForm.category = null
        oldForm.status = null

        oldForm.tags = []
        await updateForm({ _id: formId }, oldForm)
      })
    }

    if (details && details.group && details.group._id && details.contacts && details.contacts.length > 0) {
      details.contacts.forEach(async (contactId) => {
        const contact = await findContact({ _id: contactId }, [
          { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
          { path: 'pipelineDetails.statusHistory.changedBy' },
          { path: 'groupHistory.changedBy', ref: 'User' },
          { path: 'group.id', ref: 'Groups' },
          { path: 'status.id', ref: 'Status' },
          { path: 'category.id', ref: 'Category' },
          { path: 'tags', ref: 'Tags' }
        ])
        const tags = []
        contact?.tags?.forEach((tag) => {
          tags.push({ id: tag._id, code: tag.tagId, title: tag.tagName })
        })

        if (contact && contact.pipelineDetails && contact.pipelineDetails.length > 0) {
          contact?.pipelineDetails.map((pipeline) => {
            if (pipeline.pipeline) {
              const id = pipeline?.pipeline?.id?._id
              pipeline.pipeline.id = id
            }
            if (pipeline.status) {
              const id = pipeline?.status?.id?._id
              pipeline.status.id = id
            }
          })
        }

        contact.groupHistory.push({
          changedBy: currentUser._id,
          status: {
            id: contact?.status?.id?._id ? contact?.status?.id?._id : null,
            code: contact?.status?.id?.statusCode ? contact?.status?.id?.statusCode : null,
            title: contact?.status?.id?.statusName ? contact?.status?.id?.statusName : null
          },
          statusHistory: contact.statusHistory,
          category: {
            id: contact?.category?.id?._id ? contact?.category?.id?._id : null,
            code: contact?.category?.id?.categoryId ? contact?.category?.id?.categoryId : null,
            title: contact?.category?.id?.categoryName ? contact?.category?.id?.categoryName : null
          },
          categoryHistory: contact.categoryHistory,
          tags,
          tagsHistory: contact?.tagsHistory,
          pipelineDetails: contact.pipelineDetails,
          questions: contact.questions,
          group: {
            id: contact?.group?.id?._id ? contact?.group?.id?._id : null,
            code: contact?.group?.id?.groupCode ? contact?.group?.id?.groupCode : null,
            title: contact?.group?.id?.groupName ? contact?.group?.id?.groupName : null
          }
        })

        contact.group.id = details.group._id
        contact.status = null
        contact.statusHistory = []
        contact.category = null
        contact.categoryHistory = []
        contact.tagsHistory = []
        contact.tags = []
        contact.questions = []
        contact.pipelineDetails = []

        await updateContactAPI({ _id: contactId }, contact)
      })
    }

    if (details && details.status && details.status._id && details.contacts && details.contacts.length > 0) {
      details.contacts.forEach(async (contactId) => {
        const contact = await findContact({ _id: contactId })
        const status = await findStatus({ _id: contact?.status?.id })

        const obj = {}
        obj.code = status.statusCode
        obj.title = status.statusName

        contact.statusHistory.push({
          changedBy: currentUser._id,
          status: obj
        })
        contact.status.id = details.status._id
        await updateContactAPI({ _id: contactId }, contact)
      })
    }

    if (details && details.category && details.category._id && details.contacts && details.contacts.length > 0) {
      details.contacts.forEach(async (contactId) => {
        const contact = await findContact({ _id: contactId })
        const category = await findCategory({ _id: contact?.category?.id })

        const obj = {}
        obj.code = category.categoryId
        obj.title = category.categoryName

        contact.categoryHistory.push({
          changedBy: currentUser._id,
          category: obj
        })
        contact.category.id = details.category._id

        await updateContactAPI({ _id: contactId }, contact)
      })
    }

    if (details && details?.tag && details.contacts) {
      const tempContactObjArray = []
      details.contacts.forEach(async (contactId) => {
        const contact = await findContact({ _id: contactId }).populate({ path: 'tags', ref: 'Tags' })
        let newTagIds = []
        if (contact.tags) {
          newTagIds = JSON.parse(JSON.stringify(contact.tags?.map((obj) => obj._id)))
          const index = newTagIds.indexOf(details?.oldTagId)
          if (index !== -1) {
            if (!newTagIds.find((id) => id === details?.tag?.id)) {
              newTagIds[index] = details?.tag?.id
            } else {
              newTagIds.splice(index, 1)
            }
          }
        }
        // -----------tag history---------->> start
        let tempOldTagObjArray = []
        const tempHistoryArray = contact.tagsHistory ?? []
        if (isArray(contact?.tags)) {
          tempOldTagObjArray = JSON.parse(JSON.stringify(contact?.tags))
        }
        if (tempOldTagObjArray?.length > 0) {
          tempHistoryArray.push({
            changedBy: currentUser._id,
            tags: tempOldTagObjArray.map((obj) => ({ code: obj.tagId, title: obj.tagName }))
          })
        }

        // -----------tag history----------<< end
        tempContactObjArray.push({
          updateOne: {
            filter: {
              _id: contactId
            },
            update: {
              tags: newTagIds,
              tagsHistory: tempHistoryArray
            }
          }
        })
        await updateMultipleContact(tempContactObjArray)
      })
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log('Error:updateContactGroupDetails', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteContactDetail = async (req, res) => {
  try {
    const oldContact = await findContact({ _id: ObjectId(req.params.id) })

    if (oldContact?.enableBilling === true && oldContact?.billingCustomerId) {
      await deleteBillingContact(oldContact?.billingCustomerId)
    }

    const contact = await deleteContact({ _id: ObjectId(req.params.id) })
    if (contact && contact.acknowledged && contact.deletedCount === 0) {
      return generalResponse(res, false, 'Contact Not Exists.', 'error', true)
    }
    return generalResponse(res, null, 'Contact deleted successfully!')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const archiveContactDetail = async (req, res) => {
  try {
    const contact = await updateContactAPI(
      { _id: ObjectId(req.params.id) },
      {
        archived: req.body.archived
      }
    )
    if (req?.body?.userId) {
      const __dirname = path.resolve()
      const user = await findUser({ _id: ObjectId(req?.body?.userId) })
      await updateUser(
        { _id: ObjectId(req?.body?.userId) },
        {
          active: !req.body.archived
        }
      )
      if (!req.body.archived) {
        const body = await ejs.renderFile(path.join(__dirname, '/src/views/allowLoginInfo.ejs'), {
          fullName: user?.firstName || user?.lastName ? `${user?.firstName} ${user?.lastName}` : null,
          activeStatus: `${
            !req.body.archived
              ? 'Admin has activated your account.'
              : 'Oops, Admin has deactivated your account for some reason. Please kindly contact admin or mail on support@xyz.com.'
          }`,
          link: '',
          title: `${!req.body.archived ? 'Account activated' : 'Account deactivated'}`
        })
        sendMail({
          receiver: user?.email,
          subject: `${!req.body.archived ? 'Account activated' : 'Account deactivated'}`,
          body,
          htmlBody: body
        })
      }
    }

    if (contact && contact.acknowledged && contact.deletedCount === 0) {
      return generalResponse(res, false, 'Contact Not Exists.', 'error', true)
    }
    return generalResponse(res, null, `Contact ${req.body.archived ? 'archived' : 'activated'} successfully!`)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const archiveMultipleContacts = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { contactFilters } = req.body

    const { is_all_selected, selected_contacts } = contactFilters || {}

    let contacts = selected_contacts || []
    if (is_all_selected) {
      const filters = { ...contactFilters, company: currentUser?.company, select: '_id' }
      const results = await getSelectedContactsWithFilters(filters)
      contacts = (results.contacts || []).map((c) => c._id)
    }

    if (contacts.length) {
      await updateManyContactAPI({ _id: { $in: contacts?.map((contact) => ObjectId(contact)) } }, { archived: true })
    }
    return generalResponse(res, null, 'Contacts archived successfully!', 'success', true, 200)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const validateImportContact = async (req, res) => {
  try {
    const { socketInstance } = req
    const mappedColumns = JSON.parse(req.body.mappedColumns || null) || {}
    const mappedCustomColumns = JSON.parse(req.body.mappedCustomColumns || null) || {}

    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const companyId = currentUser.company
    const companyData = await findOneCompany({ _id: companyId }, { dateFormat: 1 })

    if (req.files?.[0]) {
      const file = reader.readFile(req.files[0].path, { cellDates: true })

      const mainSheet = file.SheetNames[0]
      const importedContacts = reader.utils.sheet_to_json(file.Sheets[mainSheet], { raw: false })
      const headerRow = reader.utils.sheet_to_json(file.Sheets[mainSheet], { header: 1 })[0]

      for (const record of importedContacts) {
        for (const key of headerRow) {
          if (
            isNaN(Number(record[key])) &&
            moment(record[key]).isValid() &&
            moment(record[key], 'YYYY-MM-DD').isValid()
          ) {
            record[key] = moment(new Date(record[key])).format(companyData?.dateFormat || 'MM/DD/YYYY')
          }
        }
      }

      removeFile(req.files[0].path)

      // const importedContacts = JSON.parse(JSON.stringify(data))
      if (importedContacts && importedContacts.length > 0) {
        const [mKeys, mCols] = [Object.keys(mappedColumns), Object.values(mappedColumns)]
        const [mCustomKeys, mCustomCols] = [Object.keys(mappedCustomColumns), Object.values(mappedCustomColumns)]

        const finalImportedContacts = importedContacts.map((contact) => {
          const newContactObj = {}
          const customeField = []

          Object.entries(contact).forEach(([key, value]) => {
            const isMapExist = mCols.find((col) => col === key)
            if (isMapExist) {
              const existKey = mKeys.find((key) => mappedColumns[key] === isMapExist)
              newContactObj[existKey] = value
            } else {
              newContactObj[key] = value
            }

            const isCustomMapExist = mCustomCols.find((col) => col === key)
            if (isCustomMapExist) {
              const existKey = mCustomKeys.find((key) => mappedCustomColumns[key] === isCustomMapExist)
              const field = { question: existKey, answer: value }
              customeField.push(field)
            }
          })

          return { ...newContactObj, customeField }
        })

        const importedContactsEmails = finalImportedContacts
          ?.filter((contact) => contact?.email != null && isValidateEmail(contact?.email))
          .map((contact) => contact?.email)

        let checkForEmailExists = await findAllContact({
          email: { $in: importedContactsEmails },
          company: ObjectId(currentUser.company)
        })

        if (checkForEmailExists.length) {
          checkForEmailExists = checkForEmailExists.map((contact) => contact?.email)
        }

        const importContactJob = await createImportContactsJob({
          status: IMPORT_CONTACTS_STATUS.pending,
          errorReason: null,
          company: ObjectId(currentUser.company)
        })

        const emails = []
        const tempContacts = []
        finalImportedContacts.forEach((contact, index) => {
          const obj = {}
          obj.importedContact = importContactJob._id
          obj.contactErrors = {
            isEmailNotExists: false,
            isNameNotExists: false,
            isContactAlreadyExists: false,
            isDuplicateEmail: false,
            isInvalidEmail: false
          }

          if (!contact?.firstName) {
            obj.contactErrors.isNameNotExists = true
          }

          if (contact?.email) {
            if (!isValidateEmail(contact?.email)) {
              obj.contactErrors.isInvalidEmail = true
            }
            if (checkForEmailExists.includes(contact?.email)) {
              obj.contactErrors.isContactAlreadyExists = true
            }
            if (emails.includes(contact?.email)) {
              obj.contactErrors.isDuplicateEmail = true
              delete finalImportedContacts[index]
              // contact.isDuplicate = true
            }
          }

          if (contact?.tags) {
            contact.tags = contact?.tags?.split?.(',')
          }

          if (!Object.values(obj.contactErrors).includes(true)) {
            obj.contactErrors = null
          }

          emails.push(contact?.email)
          obj.company = ObjectId(currentUser.company)
          obj.data = contact

          tempContacts.push(obj)
        })
        await createBulkImportContacts([...tempContacts])
        socketInstance && socketInstance.emit('uploadProgress', 100)
        return generalResponse(res, importContactJob, '')
      } else {
        socketInstance && socketInstance.emit('uploadProgress', 100)
        return generalResponse(res, [], '')
      }
      // res.send(data)
    } else {
      throw new Error('File uploading error!')
    }
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const importedContacts = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { importedContacts: contacts, actionFields } = req.body
    const {
      group: groupDetails,
      status: statusDetail,
      category: categoryDetail,
      tags: tagsDetails,
      pipelineDetails
    } = actionFields

    if (
      contacts &&
      contacts.length > 0 &&
      currentUser.company &&
      contacts.filter((c) => {
        if (groupDetails) {
          return c
        }
        if (!c.isExist) {
          return c
        }
      }).length > 0
    ) {
      const newContactsDetail = []
      Promise.all(
        contacts
          .filter((c) => {
            if (groupDetails) {
              return c
            }
            if (!c.isExist) {
              return c
            }
          })
          .filter((c) => !c.isDuplicate)
          .map(async (contact) => {
            if (contact.email) {
              const isContactExist = await findContact(
                { email: contact.email, company: ObjectId(currentUser.company) },
                [
                  { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
                  { path: 'pipelineDetails.statusHistory.changedBy' },
                  { path: 'groupHistory.changedBy', ref: 'User' },
                  { path: 'group.id', ref: 'Groups' },
                  { path: 'status.id', ref: 'Status' },
                  { path: 'category.id', ref: 'Category' },
                  { path: 'tags', ref: 'Tags' }
                ]
              )
              if (!isContactExist) {
                if (contact?.group || groupDetails) {
                  // Check for group
                  if (groupDetails) {
                    contact.group = { id: groupDetails }
                  } else {
                    const isGroupExist = await findGroup({
                      groupCode: contact?.group.replace(/ /g, '-').toLowerCase(),
                      company: ObjectId(currentUser.company),
                      groupName: contact?.group
                    })
                    if (isGroupExist) {
                      contact.group = { id: isGroupExist._id }
                    } else {
                      // Create new group
                      const group = await createGroup({
                        groupCode: contact?.group.replace(/ /g, '-').toLowerCase(),
                        groupName: contact?.group,
                        company: ObjectId(currentUser.company)
                      })
                      contact.group = { id: group._id }
                    }
                  }

                  // check for status
                  if (statusDetail) {
                    contact.status = { id: statusDetail }
                  } else {
                    if (contact?.group?.id && contact?.status) {
                      const isStatusExist = await findStatus({
                        statusCode: contact?.status.replace(/ /g, '-').toLowerCase(),
                        company: ObjectId(currentUser.company),
                        groupId: ObjectId(contact?.group?.id)
                      })
                      if (isStatusExist) {
                        contact.status = { id: isStatusExist._id }
                      } else {
                        // Create new status
                        const newstatus = await createStatus({
                          statusName: contact?.status,
                          statusCode: contact?.status.replace(/ /g, '-').toLowerCase(),
                          groupId: contact?.group?.id,
                          company: ObjectId(currentUser.company)
                        })
                        contact.status = { id: newstatus._id }
                      }
                    }
                  }

                  if (categoryDetail) {
                    contact.category = { id: categoryDetail }
                  } else {
                    // check for category
                    if (contact?.group?.id && contact?.category) {
                      const isCategoryExists = await findCategory({
                        categoryId: contact?.category.replace(/ /g, '-').toLowerCase(),
                        company: ObjectId(currentUser.company),
                        groupId: ObjectId(contact?.group?.id)
                      })

                      if (isCategoryExists) {
                        contact.category = { id: isCategoryExists._id }
                      } else {
                        // Create a new Category
                        const newCategory = await createCategory({
                          categoryName: contact?.category,
                          categoryId: contact?.category.replace(/ /g, '-').toLowerCase(),
                          company: ObjectId(currentUser.company),
                          groupId: ObjectId(contact?.group?.id)
                        })
                        contact.category = { id: newCategory._id }
                      }
                    }
                  }

                  if (tagsDetails) {
                    contact.tags = tagsDetails
                  } else {
                    if (contact?.group?.id && contact?.tags?.length) {
                      const tagsId = []
                      await Promise.all(
                        contact?.tags.map(async (tag) => {
                          // promise.push()
                          const isTagExists = await findTag({
                            tagId: tag.replace(/ /g, '-').toLowerCase(),
                            company: ObjectId(currentUser.company),
                            groupId: ObjectId(contact?.group?.id)
                          })
                          if (isTagExists) {
                            tagsId.push(isTagExists._id)
                          } else {
                            // Create a new Category
                            const newTag = await createTag({
                              tagName: tag,
                              tagId: tag.replace(/ /g, '-').toLowerCase(),
                              company: ObjectId(currentUser.company),
                              groupId: ObjectId(contact?.group?.id)
                            })
                            tagsId.push(newTag)
                            // contact.category = { id: newCategory._id }
                          }
                        })
                      ).then(async () => {
                        contact.tags = tagsId
                      })
                    }
                  }

                  if (pipelineDetails) {
                    contact.pipelineDetails = pipelineDetails?.map((pipeline) => {
                      pipeline.pipeline = { id: pipeline.pipeline }
                      pipeline.status = { id: pipeline.status }
                      return pipeline
                    })
                  } else {
                    // check for pipeline
                    if (contact?.group?.id && contact?.pipeline) {
                      const isPipelineExist = await findPipeline({
                        pipelineCode: contact?.pipeline.replace(/ /g, '-').toLowerCase(),
                        company: ObjectId(currentUser.company),
                        groupId: ObjectId(contact?.group?.id)
                      })

                      if (isPipelineExist) {
                        const pipelineObj = { pipeline: { id: isPipelineExist._id } }

                        if (contact?.stage) {
                          const stage = (isPipelineExist?.stages || []).find(
                            (s) => s.code === contact.stage.replace(/ /g, '-').toLowerCase()
                          )

                          if (stage?._id) {
                            pipelineObj.status = { id: stage._id }
                          } else {
                            const stages = isPipelineExist?.stages || []
                            const newStage = {
                              title: contact.stage,
                              code: contact.stage.replace(/ /g, '-').toLowerCase()
                            }
                            stages.push(newStage)

                            await updatePipeline({ _id: isPipelineExist._id }, { stages })

                            const updatedPipeline = await findPipeline({ _id: isPipelineExist._id })

                            const stage = (updatedPipeline?.stages || []).find(
                              (s) => s.code === contact.stage.replace(/ /g, '-').toLowerCase()
                            )
                            if (stage?._id) {
                              pipelineObj.status = { id: stage._id }
                            }
                          }
                        }

                        contact.pipelineDetails = [pipelineObj]
                      } else {
                        // Create a new pipeline

                        const stages = []

                        if (contact?.stage) {
                          const newStage = {
                            title: contact.stage,
                            code: contact.stage.replace(/ /g, '-').toLowerCase()
                          }
                          stages.push(newStage)
                        }

                        const newPipeline = await createPipeline({
                          pipelineName: contact?.pipeline,
                          pipelineCode: contact?.pipeline.replace(/ /g, '-').toLowerCase(),
                          company: ObjectId(currentUser.company),
                          groupId: ObjectId(contact?.group?.id),
                          stages
                        })

                        if (newPipeline) {
                          const pipelineObj = { pipeline: { id: newPipeline._id } }

                          if (contact?.stage) {
                            const stage = newPipeline.stages.find(
                              (s) => s.code === contact.stage.replace(/ /g, '-').toLowerCase()
                            )

                            if (stage?._id) {
                              pipelineObj.status = { id: stage._id }
                            }
                          }

                          contact.pipelineDetails = [pipelineObj]
                        }
                      }
                    }
                  }
                  const newContact = await createContact({
                    ...contact,
                    company: ObjectId(currentUser.company),
                    archived: false,
                    deleted: false
                  })
                  newContactsDetail.push(newContact)
                } else {
                  delete contact?.status
                  delete contact?.category
                  delete contact?.tags

                  const newContact = await createContact({
                    ...contact,
                    company: ObjectId(currentUser.company),
                    archived: false,
                    deleted: false
                  })
                  newContactsDetail.push(newContact)
                }
              } else {
                if (
                  isContactExist?.group !== null &&
                  groupDetails !== null &&
                  !isContactExist?.group?.id?.equals(ObjectId(groupDetails))
                ) {
                  if (!isContactExist.groupHistory) {
                    isContactExist.groupHistory = []
                  }
                  const tags = []
                  if (isContactExist?.tags) {
                    isContactExist?.tags.forEach((tag) => {
                      tags.push({ id: tag._id, code: tag.tagId, title: tag.tagName })
                    })
                  }
                  if (isContactExist && isContactExist.pipelineDetails && isContactExist.pipelineDetails.length > 0) {
                    isContactExist?.pipelineDetails.map((pipeline) => {
                      if (pipeline.pipeline) {
                        const id = pipeline?.pipeline?.id?._id
                        pipeline.pipeline.id = id
                      }
                      if (pipeline.status) {
                        const id = pipeline?.status?.id?._id
                        pipeline.status.id = id
                      }
                    })
                  }

                  isContactExist.groupHistory.push({
                    changedBy: currentUser._id,
                    status: {
                      id: isContactExist?.status?.id?._id ? isContactExist?.status?.id?._id : null,
                      code: isContactExist?.status?.id?.statusCode ? isContactExist?.status?.id?.statusCode : null,
                      title: isContactExist?.status?.id?.statusName ? isContactExist?.status?.id?.statusName : null
                    },
                    statusHistory: isContactExist.statusHistory,
                    category: {
                      id: isContactExist?.category?.id?._id ? isContactExist?.category?.id?._id : null,
                      code: isContactExist?.category?.id?.categoryId ? isContactExist?.category?.id?.categoryId : null,
                      title: isContactExist?.category?.id?.categoryName
                        ? isContactExist?.category?.id?.categoryName
                        : null
                    },
                    categoryHistory: isContactExist.categoryHistory,
                    tags,
                    tagsHistory: isContactExist?.tagsHistory,
                    pipelineDetails: isContactExist.pipelineDetails,
                    questions: isContactExist.questions,
                    group: {
                      id: isContactExist?.group?.id?._id ? isContactExist?.group?.id?._id : null,
                      code: isContactExist?.group?.id?.groupCode ? isContactExist?.group?.id?.groupCode : null,
                      title: isContactExist?.group?.id?.groupName ? isContactExist?.group?.id?.groupName : null
                    }
                  })
                }
                isContactExist.group = groupDetails ? { id: groupDetails } : null
                isContactExist.status = statusDetail ? { id: statusDetail } : null
                isContactExist.category = categoryDetail ? { id: categoryDetail } : null
                isContactExist.tags = tagsDetails?.length ? tagsDetails : []
                isContactExist.pipelineDetails = pipelineDetails.length
                  ? pipelineDetails?.map((pipeline) => {
                      pipeline.pipeline = { id: pipeline.pipeline }
                      pipeline.status = { id: pipeline.status }
                      return pipeline
                    })
                  : []
                await updateContactAPI(
                  { _id: isContactExist?._id, email: contact.email, company: ObjectId(currentUser.company) },
                  isContactExist
                )
              }
            }
          })
      ).then(() => {
        return generalResponse(res, newContactsDetail, 'successfully done!')
      })
    } else {
      return generalResponse(
        res,
        null,
        { text: 'Contacts not found or All the contact is registered.' },
        'error',
        false,
        400
      )
    }
  } catch (error) {
    console.log('Error while processing', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const unSubscribeContact = async (req, res) => {
  try {
    const { id } = req.body
    if (!id) {
      return generalResponse(res, null, { text: 'id is required' }, 'error', false, 400)
    }
    await updateContactAPI({ _id: ObjectId(atob(id)) }, { hasUnsubscribed: true })
    return generalResponse(res, null, 'Unsubscribe successfully done!')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const unsubscribeFromSheet = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    if (req.files?.[0]) {
      const file = reader.readFile(req.files[0].path)
      const data = []
      const sheets = file.SheetNames
      for (let i = 0; i < sheets.length; i++) {
        const tempData1 = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]])
        tempData1.forEach((res) => {
          data.push(res)
        })
      }
      removeFile(req.files[0].path)
      const importedContacts = JSON.parse(JSON.stringify(data))
      if (importedContacts && importedContacts.length > 0) {
        const promises = []
        const tempEmails = []
        importedContacts.map(async (contact) => {
          if (contact?.email) {
            if (!tempEmails.includes(contact.email)) {
              promises.push(
                updateContactAPI(
                  { email: contact?.email, company: ObjectId(currentUser.company) },
                  { hasUnsubscribed: true }
                )
              )
              tempEmails.push(contact.email)
            }
          }
        })

        Promise.all(promises).then((contactRes) => {
          const updatedContact = contactRes?.filter(
            (contact) => contact?.modifiedCount === 1 || contact?.upsertedCount === 1
          )?.length
          return generalResponse(res, updatedContact, 'Unsubscribe successfully done!')
        })
      } else {
        return generalResponse(res, 0, 'Unsubscribe successfully done!')
      }
    } else {
      throw new Error('File uploading error!')
    }
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteMultipleContacts = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { contactFilters } = req.body

    const { is_all_selected, selected_contacts } = contactFilters || {}

    let contacts = selected_contacts || []
    if (is_all_selected) {
      const filters = { ...contactFilters, company: currentUser?.company, select: '_id' }
      const results = await getSelectedContactsWithFilters(filters)
      contacts = (results.contacts || []).map((c) => c._id)
    }

    if (!contacts.length) {
      return generalResponse(res, null, { text: 'contacts is required' }, 'error', false, 400)
    }

    const promises = []
    contacts.forEach(async (id) => {
      promises.push(deleteContact({ _id: ObjectId(id) }))
    })
    Promise.all(promises).then(() => {
      return generalResponse(res, null, 'Contacts deleted successfully!')
    })
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const changeContactGroups = async (req, res) => {
  try {
    const { contactFilters, oldGroup } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const { is_all_selected, selected_contacts } = contactFilters || {}

    let contacts = selected_contacts || []
    if (is_all_selected) {
      const filters = { ...contactFilters, company: currentUser?.company, select: '_id' }
      const results = await getSelectedContactsWithFilters(filters)
      contacts = (results.contacts || []).map((c) => c._id)
    }

    if (!contacts?.length && !oldGroup) {
      return generalResponse(res, null, { text: 'contacts list is required' }, 'error', false, 400)
    }

    if (oldGroup) {
      contacts = await findAllContact({ 'group.id': oldGroup })
      if (!contacts?.length) {
        return generalResponse(res, null, { text: 'contacts not found' }, 'error', false, 400)
      } else {
        contacts = contacts.map((id) => id)
      }
    }

    if (contacts?.length) {
      await createChangeContactsGroupSchedulerJob(
        {
          contacts: contacts?.map((contact) => contact),
          company: ObjectId(currentUser.company),
          currentUser,
          ...req.body
        },
        0
      )

      return generalResponse(res, null, 'Contacts Updated successfully!')
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const countContacts = async (req, res) => {
  try {
    const countsContact = await Contacts.count(req.body)
    return generalResponse(res, countsContact, 'Contacts Updated successfully!')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.aggregate([
      {
        $match: {
          parent: null
        }
      },
      {
        $lookup: {
          from: 'permissions',
          localField: '_id',
          foreignField: 'parent',
          as: 'children'
        }
      }
    ])

    return generalResponse(res, permissions, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
