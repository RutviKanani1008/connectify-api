// ==================== Packages =======================
import { ObjectId } from 'mongodb'
// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {
  createMassEmail,
  deleteMassEmail,
  findAllMassEmail,
  findMassEmail,
  findTotalMassMailCount,
  updateMassEmail
} from '../repositories/massEmail.repository'
import { findOneEmailTemplate } from '../repositories/emailTemplates.repository'
import { createMassEmilSchedulerJob } from '../helpers/jobSchedulerQueue.helper'
import {
  createScheduledMassEmail,
  findScheduledMassEmail,
  updateScheduledMassEmail
} from '../repositories/scheduledMassEmail'
import { getSelectParams, getSendGridStatisticsDetails } from '../helpers/generalHelper'
import { findAllContact, getSelectedContactsWithFilters } from '../repositories/contact.repository'
import { findIntegration } from '../repositories/integrations.repository'

const keyFields = ['status', 'category']
const pipelineFilter = {
  pipeline: 'pipelineDetails.pipeline.id',
  stage: 'pipelineDetails.status.id'
}
const arrayKeyFields = ['tags', 'group']

export const getMassEmailDetails = async (req, res) => {
  try {
    const { page = 1, limit = 100000 } = req.query
    delete req.query?.page
    delete req.query?.limit

    const currentPage = page * 1 || 1
    const recordLimit = limit * 1 || 10
    const skip = recordLimit * (currentPage - 1)

    const massEmailDetails = await findAllMassEmail(
      req.query,
      {
        ...getSelectParams({
          query: {
            select: 'company,contacts,saveAs,template,title,createdAt'
          }
        })
      },
      skip,
      recordLimit
    )

    const totalMassMail = await findTotalMassMailCount(req.query)
    console.log({ totalMassMail })
    return generalResponse(res, { massEmailDetails, totalMassMail }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificMassEmailDetails = async (req, res) => {
  try {
    const massEmail = await findMassEmail({ _id: req.params.id }, getSelectParams(req), [
      { path: 'template', ref: 'Email-Template', select: 'name' },
      { path: 'contacts', ref: 'Contacts', select: '_id' }
    ])
    return generalResponse(res, massEmail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificMassEmailContacts = async (req, res) => {
  try {
    const page = req.query.page * 1 || 1
    const limit = req.query.limit * 1 || 10
    const skip = limit * (page - 1)

    const match = {}
    const search = req.query.search || ''
    const reg = new RegExp(search, 'i')

    const selectParams = req.query.select ? getSelectParams({ query: { select: req.query.select } }) : null

    if (search) {
      match.$or = [{ firstName: { $regex: reg } }, { lastName: { $regex: reg } }, { email: { $regex: reg } }]
    }

    const massEmail = await findMassEmail({ _id: req.params.id }, {}, [
      { path: 'contacts', match, options: { sort: req.query.sort } }
    ])

    if (!massEmail) {
      return generalResponse(res, false, { text: 'Not Found.' }, 'error', false, 400)
    }

    const massEmailWithContacts = await findMassEmail({ _id: req.params.id }, { contacts: { $slice: [skip, limit] } }, [
      { path: 'contacts', match, ...(selectParams && { select: selectParams }) }
    ])

    return generalResponse(
      res,
      { results: massEmailWithContacts.contacts, total: massEmail.contacts.length },
      'success'
    )
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addMassEmailDetail = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const { filters, company, selected, massCreatedAt, search = '' } = req.body
    const q = { title: req.body.title }
    q.company = currentUser.company
    const MassEmail = await findAllMassEmail(q, { ...getSelectParams({ query: { select: '_id,company,title' } }) })
    if (MassEmail && MassEmail.length > 0) {
      return generalResponse(res, false, { text: 'MassEmail Already Exists.' }, 'error', false, 400)
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

    obj.company = company
    const contacts = await findAllContact(
      { ...obj, email: { $ne: null }, createdAt: { $lte: massCreatedAt }, hasUnsubscribed: false },
      { _id: 1, email: 1 }
    )

    const newMassEmail = await createMassEmail({ ...req.body, contacts: contacts?.map((contact) => contact?._id) })

    return generalResponse(res, newMassEmail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteMassEmailDetail = async (req, res) => {
  try {
    await deleteMassEmail({ _id: ObjectId(req.params.id) })

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateMassEmailDetail = async (req, res) => {
  try {
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
    await updateMassEmail(
      { _id: ObjectId(req.params.id) },
      { ...req.body, contacts: contacts?.map((contact) => contact?._id) }
    )
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const sendMassEmailWithoutSave = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const { massCreatedAt, filters, selected, company, search = '' } = req.body
    const q = {}
    q.company = currentUser.company
    const data = req.body
    const template = await findOneEmailTemplate({ _id: ObjectId(data.template) })
    if (!template) {
      return generalResponse(res, false, { text: 'Template does not exists.' }, 'error', false, 400)
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
          // obj[key] = { $in: filters[key] }
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
      })

      /* check for unselected from select All */
      obj._id = { $nin: (req.body.exceptionsContacts || []).map((contact) => ObjectId(contact)) || [] }
    }
    if (selected === 'currentContacts') {
      obj._id = { $in: req.body.contacts?.map((contact) => ObjectId(contact)) || [] }
    }
    obj.company = company

    const contacts = await findAllContact(
      { ...obj, email: { $ne: null }, createdAt: { $lte: massCreatedAt }, hasUnsubscribed: false },
      { _id: 1 }
    )

    if (contacts?.length) {
      const contactIds = contacts?.map((contact) => contact._id)

      // Need to save temporary mass email after send mail ,delete this mass email
      const newMassEmail = await createMassEmail({
        contacts: contactIds,
        template: data.template,
        company: data.company,
        title: new Date().getTime(),
        saveAs: false
      })

      if (newMassEmail) {
        const isExist = await findScheduledMassEmail({
          scheduledJobName: data.title,
          ...q
        })

        if (isExist) {
          return generalResponse(res, false, { text: 'Scheduled job title already exist' }, 'error', false, 400)
        }

        console.log('data.delay.value', data.delay.value)

        // first create empty job
        const newScheduledMail = await createScheduledMassEmail({
          scheduledTime: data.delayTime,
          company: data.company,
          massEmailId: newMassEmail._id,
          scheduledJobName: data.title,
          contacts: contactIds,
          template: data.template,
          senderEmail: data?.fromEmail || null,
          senderName: data?.fromName || null,
          delay: data.delay.value
        })

        console.log({ newScheduledMail })

        const job = await createMassEmilSchedulerJob(
          {
            company: data.company,
            massEmailId: newMassEmail._id,
            scheduledId: newScheduledMail._id
          },
          data.sendAfter
        )

        if (job.id) {
          // if mail is scheduled then we add in data in scheduled mass email
          await updateScheduledMassEmail(
            {
              _id: newScheduledMail._id
            },
            {
              jobId: job.id
            }
          )
        } else {
          throw new Error('Something went wrong!')
        }
      } else {
        throw new Error('Something went wrong!')
      }
    } else {
      throw new Error('Something went wrong!')
    }

    return generalResponse(res, 'Email Send Successfully', 'success')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const sendMassEmailFromContactList = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { contactFilters, isContactRequest = false } = req.body

    const { is_all_selected, selected_contacts } = contactFilters || {}

    let contacts = selected_contacts || []
    if (is_all_selected) {
      const filters = { ...contactFilters, company: currentUser?.company, email: { $ne: null }, select: '_id' }
      const results = await getSelectedContactsWithFilters(filters)
      contacts = results.contacts.map((c) => c._id)
    }

    const q = {}
    q.company = currentUser.company
    const data = req.body
    const template = await findOneEmailTemplate({ _id: ObjectId(data.template) })
    if (!template) {
      return generalResponse(res, false, { text: 'Template does not exists.' }, 'error', false, 400)
    }

    if (contacts?.length) {
      // Need to save temporary mass email after send mail ,delete this mass email
      const newMassEmail = await createMassEmail({
        contacts,
        template: data.template,
        company: data.company,
        title: new Date().getTime(),
        saveAs: false
      })

      if (newMassEmail) {
        const isExist = await findScheduledMassEmail({
          scheduledJobName: data.title,
          ...q
        })

        if (isExist) {
          return generalResponse(res, false, { text: 'Scheduled job title already exist' }, 'error', false, 400)
        }

        // first create empty job
        const newScheduledMail = await createScheduledMassEmail({
          scheduledTime: data.delayTime,
          company: data.company,
          massEmailId: newMassEmail._id,
          scheduledJobName: data.title,
          contacts,
          template: data.template,
          senderEmail: data?.fromEmail || null,
          senderName: data?.fromName || null,
          delay: data.delay.value
        })

        const job = await createMassEmilSchedulerJob(
          {
            company: data.company,
            massEmailId: newMassEmail._id,
            scheduledId: newScheduledMail._id,
            isContactRequest: isContactRequest
          },
          data.sendAfter
        )

        if (job.id) {
          // if mail is scheduled then we add in data in scheduled mass email
          await updateScheduledMassEmail(
            {
              _id: newScheduledMail._id
            },
            {
              jobId: job.id
            }
          )
        } else {
          throw new Error('Something went wrong!')
        }
      } else {
        throw new Error('Something went wrong!')
      }
    } else {
      throw new Error('Something went wrong!')
    }

    return generalResponse(res, 'Email Send Successfully', 'success')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const sendMassEmailById = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const massEmail = await findMassEmail({ _id: req.params.id }, {}, [
      { path: 'template', ref: 'Email-Template' },
      { path: 'contacts', ref: 'Contacts' }
    ])

    const contactIds = massEmail.contacts.map((obj) => obj._id)

    if (!massEmail) {
      return generalResponse(res, false, { text: 'Mass emails does not exists.' }, 'error', false, 400)
    }
    if (!massEmail?.contacts?.length) {
      return generalResponse(res, false, { text: 'No contacts found.' }, 'error', false, 400)
    }

    const data = req.body

    const isExist = await findScheduledMassEmail({
      scheduledJobName: data.title,
      company: currentUser.company
    })

    if (isExist) {
      return generalResponse(res, false, { text: 'Scheduled job title already exist' }, 'error', false, 400)
    }

    // first crest empty jo
    const newScheduledMail = await createScheduledMassEmail({
      scheduledTime: data.delayTime,
      company: data.company,
      massEmailId: req.params.id,
      scheduledJobName: data.title,
      contacts: contactIds,
      template: massEmail.template._id,
      senderEmail: data?.fromEmail || null,
      senderName: data?.fromName || null,
      delay: data.delay.value
    })

    const job = await createMassEmilSchedulerJob(
      {
        ...req.body,
        massEmailId: req.params.id,
        company: currentUser.company,
        // preHeader: data?.preHeader || null,
        scheduledId: newScheduledMail._id
      },
      req.body.sendAfter
    )

    if (job.id) {
      // if mail is scheduled then we add in data in scheduled mass email
      await updateScheduledMassEmail(
        {
          _id: newScheduledMail._id
        },
        {
          jobId: job.id
        }
      )
    } else {
      throw new Error('Something went wrong!')
    }

    return generalResponse(res, 'Email Send Successfully', 'success')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSendGridMatrix = async (req, res) => {
  try {
    if (!req.query.start_date || !req.query.end_date) {
      return generalResponse(
        res,
        '',
        'start_date and end_date are required in YYYY-MM-DD format. ',
        'error',
        false,
        400
      )
    }

    const queryParams = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    }
    const currentUser = req.headers.authorization
    const sendGridKey = await findIntegration({ company: currentUser.company })

    const request = {
      url: '/v3/stats',
      method: 'GET',
      // headers: headers,
      qs: queryParams
    }
    const totalMatrix = await getSendGridStatisticsDetails(request, sendGridKey?.sendGrid?.apiKey)
    return generalResponse(res, totalMatrix, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const getSpecifcCategoryGridMatrix = async (req, res) => {
  try {
    if (!req.params.id) {
      return generalResponse(res, '', 'Schedule id or Job id is required. ', 'error', false, 400)
    }
    if (!req.query.start_date || !req.query.end_date) {
      return generalResponse(
        res,
        '',
        'start_date and end_date are required in YYYY-MM-DD format. ',
        'error',
        false,
        400
      )
    }

    const queryParams = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      categories: req.params.id
    }

    const request = {
      url: '/v3/categories/stats',
      method: 'GET',
      // headers: headers,
      qs: queryParams
    }
    const currentUser = req.headers.authorization
    const sendGridKey = await findIntegration({ company: currentUser.company })
    const totalMatrix = await getSendGridStatisticsDetails(request, sendGridKey?.sendGrid?.apiKey)
    return generalResponse(res, totalMatrix, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}
