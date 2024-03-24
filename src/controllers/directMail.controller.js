// ==================== Packages =======================
import { ObjectId } from 'mongodb'
// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import { findAllContact } from '../repositories/contact.repository'
import {
  createDirectMail,
  deleteDirectMail,
  findAllDirectMail,
  findDirectMail,
  findDirectMailWithAggregation,
  findDirectMailWithAggregationCount,
  updateDirectMail
} from '../repositories/directMail.repository'
import { getSelectParams } from '../helpers/generalHelper'
import { parseData } from '../utils/utils'

const keyFields = ['status', 'category']
const pipelineFilter = {
  pipeline: 'pipelineDetails.pipeline.id',
  stage: 'pipelineDetails.status.id'
}
const arrayKeyFields = ['tags', 'group']

export const getAllDirectMailDetails = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company: companyId } = currentUser
    let { limit = 10, page = 1, search = '', sort } = req.query
    const project = { ...getSelectParams(req) }
    const skip = Number(limit) * Number(page) - Number(limit)
    sort = parseData(sort)

    const $and = [{ company: ObjectId(companyId) }]

    if (search) {
      const reg = new RegExp(search, 'i')
      $and.push({
        $or: [{ name: { $regex: reg } }, { subject: { $regex: reg } }]
      })
    }

    const match = { ...($and.length ? { $and } : {}) }

    const total = await findDirectMailWithAggregationCount({
      match
    })
    const templates = await findDirectMailWithAggregation({
      match,
      limit: Number(limit),
      project,
      skip,
      sort
    })
    return generalResponse(res, { results: templates, pagination: { total: total[0]?.count || 0 } }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificDirectMailDetails = async (req, res) => {
  try {
    const directMail = await findDirectMail({ _id: req.params.id }, {}, [
      { path: 'directMailTemplate', ref: 'Direct-Mail-Template', select: { name: 1, description: 1, body: 1 } },
      { path: 'contacts', ref: 'Contacts', select: { firstName: 1 } }
    ])
    return generalResponse(res, directMail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addDirectMailDetail = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const { filters, selected, massCreatedAt, search = '' } = req.body
    const q = { title: req.body.title }
    q.company = currentUser.company
    const directMail = await findAllDirectMail(q)

    if (directMail && directMail.length > 0) {
      return generalResponse(res, false, { text: 'Direct Mail Already Exists.' }, 'error', false, 400)
    }

    const obj = {}

    const reg = new RegExp(search, 'i')
    if (search) {
      obj.$or = [{ firstName: { $regex: reg } }, { lastName: { $regex: reg } }, { email: { $regex: reg } }]
    }

    if (filters && Object.keys(filters)?.length && selected !== 'currentContacts') {
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
          if (key === 'group') {
            if (filters[key].includes('UnassignedItem')) {
              obj.$or = [
                {
                  'group.id': {
                    $in: filters[key].reduce((prev, curr) => {
                      if (curr !== 'UnassignedItem') {
                        return [...prev, ObjectId.isValid(curr) ? ObjectId(curr) : curr]
                      }
                      return [...prev]
                    }, [])
                  }
                },
                {
                  group: null
                }
              ]
            } else {
              obj['group.id'] = {
                $in: filters[key].map((value) => (ObjectId.isValid(value) ? ObjectId(value) : value))
              }
            }
          } else {
            obj[key] = {
              $in: filters[key].map((value) => {
                if (value === 'UnassignedItem') {
                  return null
                } else {
                  return ObjectId.isValid(value) ? ObjectId(value) : value
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

        /* check for unselected from select All */
        obj._id = { $nin: (req.body.exceptionsContacts || []).map((contact) => ObjectId(contact)) || [] }
      })
    }
    if (selected === 'currentContacts') {
      obj._id = { $in: req.body.contacts?.map((contact) => ObjectId(contact)) || [] }
    }

    obj.company = currentUser.company
    const contacts = await findAllContact(
      { ...obj, email: { $ne: null }, createdAt: { $lte: massCreatedAt }, hasUnsubscribed: false },
      { _id: 1 }
    )

    const newMassEmail = await createDirectMail({
      ...req.body,
      company: currentUser?.company,
      contacts: contacts?.map((contact) => contact?._id)
    })

    return generalResponse(res, newMassEmail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteDirectMailDetail = async (req, res) => {
  try {
    await deleteDirectMail({ _id: ObjectId(req.params.id) })

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateDirectMailDetail = async (req, res) => {
  try {
    const isDirectMail = await findDirectMail({ _id: req.params.id }, {})
    if (!isDirectMail) {
      return generalResponse(res, false, { text: 'Direct mail is not exists.' }, 'error', false, 400)
    }
    const { filters, company, selected, massCreatedAt, search = '' } = req.body

    const obj = {}

    const reg = new RegExp(search, 'i')
    if (search) {
      obj.$or = [{ firstName: { $regex: reg } }, { lastName: { $regex: reg } }, { email: { $regex: reg } }]
    }

    if (filters && Object.keys(filters)?.length && selected !== 'currentContacts') {
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
          if (key === 'group') {
            if (filters[key].includes('UnassignedItem')) {
              obj.$or = [
                {
                  'group.id': {
                    $in: filters[key].reduce((prev, curr) => {
                      if (curr !== 'UnassignedItem') {
                        return [...prev, ObjectId.isValid(curr) ? ObjectId(curr) : curr]
                      }
                      return [...prev]
                    }, [])
                  }
                },
                { group: null }
              ]
            } else {
              obj['group.id'] = {
                $in: filters[key].map((value) => (ObjectId.isValid(value) ? ObjectId(value) : value))
              }
            }
          } else {
            obj[key] = {
              $in: filters[key].map((value) => {
                if (value === 'UnassignedItem') {
                  return null
                } else {
                  return ObjectId.isValid(value) ? ObjectId(value) : value
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

        /* check for unselected from select All */
        obj._id = { $nin: (req.body.exceptionsContacts || []).map((contact) => ObjectId(contact)) || [] }
      })
    }
    if (selected === 'currentContacts') {
      obj._id = { $in: req.body.contacts?.map((contact) => ObjectId(contact)) || [] }
    }

    obj.company = company
    const contacts = await findAllContact(
      { ...obj, email: { $ne: null }, createdAt: { $lte: massCreatedAt }, hasUnsubscribed: false },
      { _id: 1 }
    )

    delete req.body._id
    await updateDirectMail(
      { _id: ObjectId(req.params.id) },
      { ...req.body, contacts: contacts?.map((contact) => contact?._id) }
    )
    const directMail = await findDirectMail({ _id: req.params.id }, {}, [
      { path: 'directMailTemplate', ref: 'Direct-Mail-Template' },
      { path: 'contacts', ref: 'Contacts', select: { firstName: 1 } }
    ])

    return generalResponse(res, directMail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificDirectMailContacts = async (req, res) => {
  try {
    const page = req.query.page * 1 || 1
    const limit = req.query.limit * 1 || 10
    const skip = limit * (page - 1)

    const match = {}
    const search = req.query.search || ''
    const reg = new RegExp(search, 'i')

    if (search) {
      match.$or = [{ firstName: { $regex: reg } }, { lastName: { $regex: reg } }, { email: { $regex: reg } }]
    }

    const massEmail = await findDirectMail({ _id: req.params.id }, {}, [
      {
        path: 'contacts',
        match,
        select: { _id: 1 }
      }
    ])

    if (!massEmail) {
      return generalResponse(res, false, { text: 'Not Found.' }, 'error', false, 400)
    }

    const massEmailWithContacts = await findDirectMail(
      { _id: req.params.id },
      {
        contacts: {
          $slice: [skip, limit]
        }
      },
      [
        {
          path: 'contacts',
          match,
          populate: [{ path: 'group.id', ref: 'Groups', select: 'groupName' }],
          select: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            company_name: 1,
            companyType: 1,
            website: 1,
            email: 1,
            phone: 1,
            address1: 1,
            address2: 1,
            city: 1,
            state: 1,
            zip: 1
          }
        }
      ]
    )

    return generalResponse(
      res,
      {
        results: JSON.parse(JSON.stringify(massEmailWithContacts.contacts || [])).map((obj) => ({
          ...obj,
          group: obj?.group?.id
        })),
        total: massEmail.contacts.length
      },
      'success'
    )
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
