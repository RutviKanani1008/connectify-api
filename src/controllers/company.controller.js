import generalResponse from '../helpers/generalResponse.helper'
import {
  createCompany,
  findCompany,
  findCompanyAggregate,
  updateCompany,
  findOneCompany,
  deleteCompany,
  findCompanyAggregateCount
} from '../repositories/companies.repository'
import { createUser, findAllUser, findUserUsingAggregate, updateUser, findUser } from '../repositories/users.repository'
import bcryptjs from 'bcryptjs'
import { validateCompanyRequest, validateUser } from './validate.controller'
import { ObjectId } from 'mongodb'
import path from 'path'
import { sendMail } from '../services/send-grid'
import ejs from 'ejs'
import { generateRandomString } from '../helpers/generateRandomString'
import { findOneEmailTemplate } from '../repositories/emailTemplates.repository'
import { INTERNAL_COMMUNICATION_TEMPLATE } from '../constants/internalCommunicationTemplate'
import { varSetInTemplate } from '../helpers/dynamicVarSetInTemplate.helper'
import { logger, parseData } from '../utils/utils'

// ** models **
import { BillingStatusHistory } from '../models/billingStatusHistory'
import { Category } from '../models/category'
import { BillingTemplate } from '../models/billingTemplate'
import { ChecklistTemplates } from '../models/checklistTemplate'
import { Contacts } from '../models/contacts'
import { CustomField } from '../models/customField'
import { Document } from '../models/document'
import { Event } from '../models/event'
import { EmailTemplates } from '../models/emailTemplate'
import { EventRSVP } from '../models/eventRsvp'
import { FeatureRequest } from '../models/featureRequest'
import { Folders } from '../models/folders'
import { FormResponse } from '../models/formResponse'
import { Forms } from '../models/forms'
import { Groups } from '../models/groups'
import { Invoices } from '../models/invoice'
import { MassEmail } from '../models/mass-email'
import { MassSMS } from '../models/mass-sms'
import { Notes } from '../models/notes'
import { PaymentMethod } from '../models/paymentMethod'
import { Pipeline } from '../models/pipeline'
import { Products } from '../models/product'
import { ProductCategory } from '../models/productCategory'
import { Quotes } from '../models/quote'
import { ReportProblem } from '../models/reportProblem'
import { ScheduledMassEmail } from '../models/scheduled-mass-email'
import { ScheduledMassSMS } from '../models/scheduled-mass-sms'
import { SMSTemplates } from '../models/smsTemplate'
import { Status } from '../models/status'
import { stripePaymentHistory } from '../models/stripePaymentHistory'
import { Tags } from '../models/tags'
import { TaskNotifyUser } from '../models/taskNotifyUser'
import { TaskOption } from '../models/taskOptions'
import { Tasks } from '../models/tasks'
import { TaskUpdate } from '../models/taskUpdates'
import { Users } from '../models/users'
import { deleteCompanyJob } from '../helpers/jobSchedulerQueue.helper'
import { getSelectParams } from '../helpers/generalHelper'
import { AfterTaskInstructionTemplate } from '../models/afterTaskInstructionTemplate'
import { CommunicationSettings } from '../models/communicationSettings'
import { ContactActivity } from '../models/contact-activity'
import { ContactsEmail } from '../models/contactsEmail'
import { Customers } from '../models/customer'
import { DirectMail } from '../models/direct-mail'
import { DirectMailTemplates } from '../models/directMailTemplate'
import { Email } from '../models/email'
import { EmailSender } from '../models/emailSender'
import { Envelope } from '../models/envelope'
import { SnoozedUserTask } from '../models/snoozeUserTask'
import { ImportContactsJob } from '../models/import-contacts-job'
import { ImportProductsJob } from '../models/import-products-job'
import { ImportContacts } from '../models/imported-contacts'
import { ImportedProducts } from '../models/imported-products'
import { Integrations } from '../models/integration'
import { InventoryOfflineOrder } from '../models/inventoryOfflineOrder'
import { InventoryOnlineOrder } from '../models/inventoryOnlineOrder'
import { InventoryProducts } from '../models/inventoryProduct'
import { InventoryProductCategory } from '../models/inventoryProductCategory'
import { InventoryProductCriteria } from '../models/inventoryProductCriteria'
import { InventoryProductSpecsDetails } from '../models/inventoryProductSpecsDetails'
import { InventoryWarehouseLocations } from '../models/inventoryWarehouseLocations'
import { InventoryWoocommerceConnection } from '../models/inventoryWoocommerceConnection'
import { InventoryWooDefaultSettings } from '../models/InventoryWooDefaultSettings'
import { MailProviderFolder } from '../models/mailProviderFolder'
import { MassMailLog } from '../models/MassMailLog'
import { PinnedUserTask } from '../models/pinnedUserTask'
import { SmtpImapCredential } from '../models/smtp-imap-credential'
import { SyncLog } from '../models/syncLog'
import { TaskTimer } from '../models/taskTimer'

const { hash } = bcryptjs

export const homeFunction = (req, res) => {
  try {
    return generalResponse(res, null, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getCompanies = async (req, res) => {
  try {
    const select = {}
    if (req.query.select) {
      const projectField = req.query.select.split(',')
      if (projectField && projectField.length > 0) {
        projectField.forEach((field) => {
          select[field] = 1
        })
      }
      delete req.query.select
    }
    const companies = await findCompany(req?.query, select)
    return generalResponse(res, companies, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getFilteredCompanies = async (req, res) => {
  try {
    const queryObj = req.query
    const { limit = 10, page = 1, search = '', sort: sortQ } = queryObj

    const $and = []
    if (search) {
      const reg = new RegExp(search, 'i')
      $and.push({
        $or: [{ name: { $regex: reg } }, { email: { $regex: reg } }]
      })
    }
    if (!queryObj.archived || queryObj.archived === 'false') {
      $and.push({ archived: { $ne: true } })
    } else {
      $and.push({ archived: true })
    }

    const match = { ...($and.length ? { $and } : {}) }

    const project = { ...getSelectParams(req) }
    const skip = Number(limit) * Number(page) - Number(limit)
    const sort = sortQ ? parseData(sortQ) : { createdAt: -1 }

    const total = await findCompanyAggregateCount({ match })
    const results = await findCompanyAggregate([
      { $match: match },
      { $sort: sort },
      { $project: project },
      { $skip: skip },
      { $limit: +limit }
    ])

    return generalResponse(res, { results, total: total[0]?.count || 0 }, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const validateCompany = async (req, res) => {
  try {
    if (req.query) {
      const companies = await findCompany(req?.query)
      if (companies.length > 0) {
        return generalResponse(res, false, { text: 'Company url already exists' }, 'error', false, 400)
      }
      return generalResponse(res, true, 'success')
    }
    return generalResponse(res, null, '', 'error', false, 400)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificCompany = async (req, res) => {
  try {
    const aggregate = [
      {
        $match: {
          _id: ObjectId(req.params.id)
        }
      },
      // Commented due to no longer use in front.
      // {
      //   $lookup: {
      //     from: 'users',
      //     let: { companyId: '$_id' },
      //     pipeline: [
      //       { $match: { $expr: { $eq: ['$company', '$$companyId'] }, role: { $in: ['superadmin', 'admin'] } } },
      //       { $project: { _id: 1, firstName: 1, lastName: 1, email: 1, phone: 1, relation: 1 } }
      //     ],
      //     as: 'members'
      //   }
      // },
      {
        $lookup: {
          from: 'users',
          localField: 'notes.userId',
          foreignField: '_id',
          as: 'populatedNotes' // The alias for the populated field
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'notes.userId',
          foreignField: '_id',
          as: 'populatedNotes' // The alias for the populated field
        }
      },
      {
        $addFields: {
          notes: {
            $map: {
              input: '$notes',
              as: 'note',
              in: {
                $mergeObjects: [
                  '$$note',
                  {
                    userId: {
                      $let: {
                        vars: {
                          user: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: '$populatedNotes',
                                  as: 'user',
                                  cond: {
                                    $eq: ['$$user._id', '$$note.userId']
                                  }
                                }
                              },
                              0
                            ]
                          }
                        },
                        in: {
                          _id: '$$user._id',
                          firstName: '$$user.firstName',
                          lastName: '$$user.lastName'
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          populatedNotes: 0
        }
      }
    ]
    const companyDetails = await findCompanyAggregate(aggregate)
    return generalResponse(res, companyDetails, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const updateCompanyDetail = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      massSmsPhone,
      address1,
      address2,
      city,
      state,
      status,
      zipcode,
      notes,
      companyLogo,
      companyUrl,
      website,
      dateFormat,
      permissions
    } = req.body

    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const companyNote = []
    if (notes && notes.length > 0) {
      notes.forEach((note) => {
        const obj = {}
        if (note && note.userId && note.userId._id) {
          obj.userId = note?.userId?._id
        } else {
          obj.userId = currentUser._id
        }
        obj.createdAt = note?.createdAt
        obj.text = note.text
        obj.isPinned = note.isPinned ?? false
        companyNote.push(obj)
      })
    }
    const companyData = {
      name,
      email,
      phone,
      massSmsPhone,
      address1,
      address2,
      city,
      state,
      zipcode,
      status,
      notes: companyNote,
      companyUrl,
      companyLogo,
      website,
      dateFormat,
      permissions
    }
    const isValid = await validateCompanyRequest(res, companyData)
    if (isValid) {
      const user = await findUser({ company: req.params.id, role: 'admin' })
      const companyOldData = await findOneCompany({ _id: req.params.id })

      /* Send Mail to company Admin on Activate / Deactivate Company */
      if (companyOldData.status !== status && user && user.email) {
        let template = null
        let templateBody = null

        if (status) {
          template = await findOneEmailTemplate({
            _id: INTERNAL_COMMUNICATION_TEMPLATE.activateAccount
          }).select({ htmlBody: true, subject: true })
          templateBody = varSetInTemplate({ name }, template.htmlBody)
        } else {
          template = await findOneEmailTemplate({
            _id: INTERNAL_COMMUNICATION_TEMPLATE.deActivateAccount
          }).select({ htmlBody: true, subject: true })
          templateBody = varSetInTemplate({ name }, template.htmlBody)
        }

        if (template && templateBody) {
          sendMail({ receiver: user.email, subject: template.subject, htmlBody: templateBody })
        }

        await updateUser({ email: user.email }, { active: status })
      }
      /* */

      await updateCompany({ _id: req.params.id }, companyData)
      return generalResponse(res, null, 'success')
    }
  } catch (error) {
    logger(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

const checkForMail = async (data, res) => {
  if (data) {
    const errors = []

    // company email validation
    const companyEmail = await findCompany({ email: data.email })
    if (companyEmail && companyEmail.length) {
      errors.push(data.email)
    }
    const { email } = data.admin
    const userEmails = []
    userEmails.push(email)
    if (data?.members && data.members.length > 0) {
      const members = data.members
      members.forEach((member) => {
        const { email } = member
        userEmails.push(email)
      })
    }
    // user as well as members email varification
    const userEmail = await findAllUser({ email: { $in: userEmails } })
    if (userEmail && userEmail.length > 0) {
      userEmail.forEach((userObj) => {
        errors.push(userObj.email)
      })
    }
    return errors
  }
}

export const addCompany = async (req, res) => {
  try {
    const errors = await checkForMail(req.body, res)
    if (errors && errors.length === 0) {
      const {
        name,
        email,
        phone,
        massSmsPhone,
        address1,
        address2,
        city,
        state,
        status,
        zipcode,
        notes,
        companyUrl,
        companyLogo,
        website,
        permissions
      } = req.body

      const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
      const companyNote = []
      if (notes && notes.length > 0) {
        notes.forEach((note) => {
          const obj = {}
          if (note && note.userId && note.userId._id) {
            obj.userId = note?.userId?._id
          } else {
            obj.userId = currentUser._id
          }
          obj.createdAt = note?.createdAt
          obj.text = note.text
          obj.isPinned = note.isPinned ?? false
          companyNote.push(obj)
        })
      }
      const companyData = {
        name,
        email,
        phone,
        massSmsPhone,
        address1,
        address2,
        city,
        state,
        zipcode,
        notes: companyNote,
        companyUrl,
        status,
        companyLogo,
        website,
        permissions
      }
      let companyDetails
      if (validateCompanyRequest(res, companyData)) {
        companyDetails = await createCompany(companyData)
        const { firstName, lastName, email, password, phone, relation, role } = req.body.admin
        const hashPassword = await hash(password, 15)
        const adminObj = {
          password: hashPassword,
          role,
          company: companyDetails._id,
          firstName,
          lastName,
          email,
          phone,
          relation,
          isVerified: true
        }
        if (validateUser(res, adminObj)) {
          await createUser(adminObj)
        }
      }
      return generalResponse(res, null, 'success')
    } else {
      return generalResponse(res, null, { text: 'Email is already registered.', errors }, 'error', false, 400)
    }
  } catch (error) {
    logger(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const getUser = async (req, res) => {
  try {
    if (req?.query) {
      const user = await findUser(req?.query)
      if (user) {
        return generalResponse(res, null, { text: 'User Already Exists' }, 'error', false, 400)
      }
      return generalResponse(res, null, 'success')
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getUserDetails = async (req, res) => {
  try {
    if (req?.query) {
      const user = await findUser(req?.query)
      return generalResponse(res, user, 'success')
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateCompanyNotes = async (req, res) => {
  try {
    const latestLodgeObj = req?.body
    const oldcompanyObj = await findOneCompany({ _id: req.params.id })
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    let notes = oldcompanyObj.notes
    if (latestLodgeObj?.notes) {
      const contactNote = []
      if (latestLodgeObj.notes && latestLodgeObj.notes.length > 0) {
        latestLodgeObj.notes.forEach((note) => {
          const obj = {}
          if (note && note.userId && note.userId._id) {
            obj.userId = note?.userId?._id
          } else {
            obj.userId = currentUser._id
          }
          obj.createdAt = note?.createdAt
          obj.text = note.text
          obj.isPinned = note.isPinned ?? false
          contactNote.push(obj)
        })
        notes = contactNote
      }
    }

    await updateCompany({ _id: req.params.id }, { ...latestLodgeObj, notes })

    const user = await findUser({ company: req.params.id, role: 'admin' })
    const authCode = generateRandomString(10)
    if (req.body.status) {
      await updateUser({ email: user.email }, { authCode, isVerified: true, active: true })
    } else {
      await updateUser({ email: user.email }, { authCode: null, active: false })
    }
    if (user && user.email && (req?.body?.status === true || req?.body?.status === false)) {
      const name = user.firstName || user.lastName ? `${user.firstName} ${user.lastName}` : ''
      const companyName = oldcompanyObj?.name || ''
      const link = `${process.env.HOST_NAME}/set-password?code=${authCode}`

      let template = null
      let templateBody = null

      if (!user.isVerified && req.body.status) {
        template = await findOneEmailTemplate({
          _id: INTERNAL_COMMUNICATION_TEMPLATE.approvedCompany
        }).select({ htmlBody: true, subject: true })
        templateBody = varSetInTemplate({ name, companyName, link }, template.htmlBody)
      } else if (req.body.status) {
        template = await findOneEmailTemplate({
          _id: INTERNAL_COMMUNICATION_TEMPLATE.activateAccount
        }).select({ htmlBody: true, subject: true })
        templateBody = varSetInTemplate({ name }, template.htmlBody)
      } else {
        template = await findOneEmailTemplate({
          _id: INTERNAL_COMMUNICATION_TEMPLATE.deActivateAccount
        }).select({ htmlBody: true, subject: true })
        templateBody = varSetInTemplate({ name }, template.htmlBody)
      }

      if (template && templateBody) {
        sendMail({ receiver: user.email, subject: template.subject, htmlBody: templateBody })
      }
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateCompanyNotesById = async (req, res) => {
  try {
    const latestNotes = req.body.notes
    if (!latestNotes) {
      return generalResponse(res, null, 'Please Provide Notes...', 'error', false, 400)
    }

    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const notes = []
    if (latestNotes.length) {
      latestNotes.forEach((note) => {
        const obj = {}
        if (note && note.userId && note.userId._id) {
          obj.userId = note.userId._id
        } else {
          obj.userId = currentUser._id
        }
        obj.createdAt = note?.createdAt
        obj.text = note.text
        obj.isPinned = note.isPinned ?? false
        notes.push(obj)
      })
    }
    await updateCompany({ _id: req.params.id }, { notes })

    generalResponse(res, null, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateContactStages = async (req, res) => {
  try {
    const latestLodgeObj = req?.body
    const { stage } = req.body
    await updateCompany({ _id: req.params.id }, { ...latestLodgeObj, contactStages: stage })
    const oldLodgeObj = await findOneCompany({ _id: req.params.id })
    return generalResponse(res, oldLodgeObj.contactStages, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getAllCompanyUser = async (req, res) => {
  try {
    if (req?.query) {
      let user
      if (req.query._id) {
        user = await findUserUsingAggregate(req?.query, [{ path: 'company' }], {})
      } else {
        user = await findAllUser(req?.query)
      }
      return generalResponse(res, user, 'success')
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const createCompanyMember = async (req, res) => {
  try {
    const user = await findUser({ email: req.body.email })
    if (user) {
      return generalResponse(res, null, { text: 'User Already Exists' }, 'error', false, 400)
    }
    const hashPassword = await hash('123456789', 15)
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (req.body?.pipelineDetails && req.body?.pipelineDetails.length > 0) {
      req.body?.pipelineDetails.forEach((company) => {
        const contactNote = []
        if (company.notes && company.notes.length > 0) {
          company.notes.forEach((note) => {
            const obj = {}
            obj.userId = currentUser._id
            obj.text = note.text
            obj.isPinned = note.isPinned ?? false
            obj.createdAt = note?.createdAt

            contactNote.push(obj)
          })
          company.notes = contactNote
        }
      })
    }
    await createUser({ ...req.body, password: hashPassword })

    const companyDetail = await findCompany({ _id: ObjectId(req.body.company) })
    if (companyDetail && companyDetail.length > 0) {
      const __dirname = path.resolve()
      const body = await ejs.renderFile(path.join(__dirname, '/src/views/companyTemplate.ejs'), {
        newMember: `${req?.body?.firstName} ${req?.body?.lastName}`,
        companyName: companyDetail[0].name,
        userRole: `${req?.body?.role}`,
        addedBy: `${req?.headers?.authorization?.firstName} ${req?.headers?.authorization?.lastName}`
      })

      sendMail({ receiver: req.body.email, subject: 'Add In New Lodge', body, htmlBody: body })
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateCompanyMember = async (req, res) => {
  try {
    // const latestContactObj = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const updatedUser = req.body
    // const oldContactObj = await findContact({ _id: req.params.id })
    const oldUserObj = await findUser({ _id: req.params.id })
    if (
      oldUserObj?.memberShipStatus !== null &&
      oldUserObj?.memberShipStatus?.value !== req.body?.memberShipStatus?.value
    ) {
      const memberShipHistory = []
      memberShipHistory.push({ history: oldUserObj?.memberShipStatus, changedBy: currentUser._id })
      if (updatedUser?.memberShipHistory && updatedUser?.memberShipHistory.length > 0) {
        updatedUser.memberShipHistory.forEach((history) => {
          memberShipHistory.push(history)
        })
      }

      updatedUser.memberShipHistory = memberShipHistory
    }
    if (updatedUser.pipelineDetails && updatedUser.pipelineDetails.length > 0) {
      updatedUser.pipelineDetails.forEach((pipeline) => {
        const contactNote = []
        const oldUser = oldUserObj.pipelineDetails.find((oldLodge) => oldLodge._id.equals(pipeline._id))
        if (pipeline.notes && pipeline.notes.length > 0) {
          pipeline.notes.forEach((note) => {
            const obj = {}
            if (note && note.userId && note.userId._id) {
              obj.userId = note?.userId?._id
            } else {
              obj.userId = currentUser._id
            }
            obj.text = note.text
            obj.isPinned = note.isPinned ?? false
            obj.createdAt = note?.createdAt

            contactNote.push(obj)
          })
          pipeline.notes = contactNote
        }
        if (oldUser?.status?.code !== pipeline?.status?.code) {
          if (!pipeline.statusHistory) {
            pipeline.statusHistory = []
          } else {
            const statusHistory = []
            if (pipeline?.statusHistory && pipeline.statusHistory.length > 0) {
              statusHistory.push(pipeline?.statusHistory)
            }
            statusHistory.push({ status: oldUser?.status, changedBy: currentUser._id })
            pipeline.statusHistory = statusHistory
          }
        }
      })
    }
    await updateUser({ _id: req.params.id }, { ...updatedUser })
    return generalResponse(res, null, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateMemberStatus = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const updatedUser = req.body
    const oldUserObj = await findUser({ _id: req.params.id })
    if (oldUserObj) {
      if (
        oldUserObj?.memberShipStatus !== null &&
        oldUserObj?.memberShipStatus?.value !== req.body?.memberShipStatus?.value &&
        req.body.updateField === 'memberShipStatus'
      ) {
        const memberShipHistory = []
        memberShipHistory.push({ history: oldUserObj?.memberShipStatus, changedBy: currentUser._id })
        if (updatedUser?.memberShipHistory && updatedUser?.memberShipHistory.length > 0) {
          updatedUser.memberShipHistory.forEach((history) => {
            memberShipHistory.push(history)
          })
        }
        updatedUser.memberShipHistory = memberShipHistory

        await updateUser({ _id: req.params.id }, { ...updatedUser })
      }
      if (oldUserObj && oldUserObj.pipelineDetails && oldUserObj.pipelineDetails.length > 0) {
        oldUserObj.pipelineDetails.forEach((pipeline) => {
          if (pipeline._id.equals(req.body._id)) {
            if (req.body.updateField === 'status' && pipeline.status.code !== req.body.status.code) {
              pipeline.statusHistory.push({ status: pipeline.status, changedBy: currentUser._id })
              pipeline.status = req.body.status
            } else if (req.body.updateField === 'dashboardStatusUpdate' && req.body.notes) {
              const contactNote = []

              req.body.notes.forEach((note) => {
                const obj = {}
                if (note && note.userId && note.userId._id) {
                  obj.userId = note?.userId?._id
                } else {
                  obj.userId = currentUser._id
                }
                obj.text = note.text
                obj.isPinned = note.isPinned ?? false
                obj.createdAt = note?.createdAt

                contactNote.push(obj)
              })
              pipeline.notes = contactNote

              if (pipeline.status.code !== req.body.status.code) {
                pipeline.statusHistory.push({ status: pipeline.status, changedBy: currentUser._id })
                pipeline.status = req.body.status
              }
            }
          }
        })
        delete oldUserObj._id
        await updateUser({ _id: req.params.id }, oldUserObj)
      }
    }
    const latestUserDetails = await findUser({ _id: req.params.id })

    let responseResult
    if (req.body.updateField === 'memberShipStatus') {
      responseResult = latestUserDetails.memberShipHistory
    }
    if (req.body.updateField === 'status') {
      responseResult = latestUserDetails.pipelineDetails.find((pipeline) => pipeline._id.equals(req.body._id))
    }

    return generalResponse(res, responseResult, 'success')
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const assignMemberPipeline = async (req, res) => {
  try {
    const { userIds } = req.body
    if (userIds && userIds.length > 0) {
      const promises = []
      userIds.forEach((userId) => {
        promises.push(findUser({ _id: userId }))
      })
      Promise.all(promises)
        .then((users) => {
          const updateUsers = []
          users.forEach((user) => {
            const obj = {}
            obj.pipeline = req.body.pipeline
            obj.status = req.body.status
            obj.note = []
            obj.statusHistory = []
            user.pipelineDetails.push(obj)

            updateUsers.push(updateUser({ _id: user._id }, user))
          })
          Promise.all(updateUsers)
            .then((updateUser) => {
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
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const archiveCompany = async (req, res) => {
  try {
    const company = await updateCompany({ _id: ObjectId(req.params.id) }, { archived: req.body.archived })

    if (company && company.acknowledged && company.deletedCount === 0) {
      return generalResponse(res, false, 'Company Not Exists.', 'error', true)
    }

    return generalResponse(res, null, `Company ${req.body.archived ? 'archived' : 'activated'} successfully!`)
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteCompanyByID = async (req, res) => {
  try {
    const { id } = req.params
    await deleteCompany({ _id: ObjectId(id) })
    await deleteCompanyJob({ id })

    return generalResponse(res, null, 'Company deleted successfully.', 'success', true)
  } catch (error) {
    logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteCompanyRemainingData = async ({ id }, done) => {
  try {
    logger('Deleting company start ....')
    await AfterTaskInstructionTemplate.delete({ company: ObjectId(id) })
    await BillingStatusHistory.delete({ company: ObjectId(id) })
    await BillingTemplate.delete({ company: ObjectId(id) })
    await Category.delete({ company: ObjectId(id) })
    await ChecklistTemplates.delete({ company: ObjectId(id) })
    await CommunicationSettings.delete({ company: ObjectId(id) })
    await ContactActivity.delete({ company: ObjectId(id) })
    await Contacts.delete({ company: ObjectId(id) })
    await ContactsEmail.delete({ company: ObjectId(id) })
    await Customers.delete({ company: ObjectId(id) })
    await CustomField.delete({ company: ObjectId(id) })
    await DirectMail.delete({ company: ObjectId(id) })
    await DirectMailTemplates.delete({ company: ObjectId(id) })
    await Document.delete({ company: ObjectId(id) })
    await Email.delete({ company: ObjectId(id) })
    await EmailSender.delete({ company: ObjectId(id) })
    await EmailTemplates.delete({ company: ObjectId(id) })
    await Envelope.delete({ company: ObjectId(id) })
    await Event.delete({ company: ObjectId(id) })
    await EventRSVP.delete({ company: ObjectId(id) })
    await FeatureRequest.delete({ company: ObjectId(id) })
    await Folders.delete({ company: ObjectId(id) })
    await FormResponse.delete({ company: ObjectId(id) })
    await Forms.delete({ company: ObjectId(id) })
    await Groups.delete({ company: ObjectId(id) })
    await ImportContactsJob.delete({ company: ObjectId(id) })
    await ImportProductsJob.delete({ company: ObjectId(id) })
    await ImportContacts.delete({ company: ObjectId(id) })
    await ImportedProducts.delete({ company: ObjectId(id) })
    await Integrations.delete({ company: ObjectId(id) })
    await InventoryOfflineOrder.delete({ company: ObjectId(id) })
    await InventoryOnlineOrder.delete({ company: ObjectId(id) })
    await InventoryProducts.delete({ company: ObjectId(id) })
    await InventoryProductCategory.delete({ company: ObjectId(id) })
    await InventoryProductCriteria.delete({ company: ObjectId(id) })
    await InventoryProductSpecsDetails.delete({ company: ObjectId(id) })
    await InventoryWarehouseLocations.delete({ company: ObjectId(id) })
    await InventoryWoocommerceConnection.delete({ company: ObjectId(id) })
    await InventoryWooDefaultSettings.delete({ company: ObjectId(id) })
    await Invoices.delete({ company: ObjectId(id) })
    await MailProviderFolder.delete({ company: ObjectId(id) })
    await MassEmail.delete({ company: ObjectId(id) })
    await MassSMS.delete({ company: ObjectId(id) })
    await MassMailLog.delete({ company: ObjectId(id) })
    await Notes.delete({ company: ObjectId(id) })
    await PaymentMethod.delete({ company: ObjectId(id) })
    await PinnedUserTask.delete({ company: ObjectId(id) })
    await Pipeline.delete({ company: ObjectId(id) })
    await Products.delete({ company: ObjectId(id) })
    await ProductCategory.delete({ company: ObjectId(id) })
    await Quotes.delete({ company: ObjectId(id) })
    await ReportProblem.delete({ company: ObjectId(id) })
    await ScheduledMassEmail.delete({ company: ObjectId(id) })
    await ScheduledMassSMS.delete({ company: ObjectId(id) })
    await SMSTemplates.delete({ company: ObjectId(id) })
    await SmtpImapCredential.delete({ company: ObjectId(id) })
    await SnoozedUserTask.delete({ company: ObjectId(id) })
    await Status.delete({ company: ObjectId(id) })
    await stripePaymentHistory.delete({ company: ObjectId(id) })
    await SyncLog.delete({ company: ObjectId(id) })
    await Tags.delete({ company: ObjectId(id) })
    await TaskNotifyUser.delete({ company: ObjectId(id) })
    await TaskOption.delete({ company: ObjectId(id) })
    await Tasks.delete({ company: ObjectId(id) })
    await TaskTimer.delete({ company: ObjectId(id) })
    await TaskUpdate.delete({ company: ObjectId(id) })
    await Users.delete({ company: ObjectId(id) })
    logger('Deleting company end ....')
    return done()
  } catch (err) {
    logger('Deleting company Error ....')
    logger(err)
    return done()
  }
}
