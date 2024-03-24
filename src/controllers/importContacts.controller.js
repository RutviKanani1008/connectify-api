import { getSelectParamsFromBody } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import {
  deleteImportContact,
  findImportContact,
  findImportContactWithAggregationCount,
  findImportContactWithAggregationErrorCount,
  findImportContactsWithAggregation,
  multipleDeleteImportContact,
  updateImportContact
} from '../repositories/imported-contacts.repository'
import { findContact } from '../repositories/contact.repository'
import { isValidateEmail } from '../helpers/contact.helper'
import {
  deleteImportContactsJob,
  findAllImportContactsJob,
  findImportContactsJob,
  updateImportContactsJob
} from '../repositories/imported-contacts-jobs.repository'
import { createImportContactsSchedulerJob } from '../schedular-jobs/import-contacts/importContactsJobSchedulerQueue.helper'

export const getCurrentImportContacts = async (req, res) => {
  try {
    // const filterOptions = [
    //   { value: 'all', label: 'All Contact' },
    //   { value: 'totalContactsWithError', label: 'Contacts with issue' },
    //   { value: 'contactsWithInvalidEmail', label: 'Contacts with issue' },
    //   { value: 'contactsAlreadyExists', label: 'Contacts with issue' },
    //   { value: 'contactsWithoutEmail', label: 'Contacts with issue' },
    //   { value: 'contactsWithDuplicateEmail', label: 'Contacts with issue' }
    // ]
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company: companyId } = currentUser
    const { limit = 10, page = 1, contactErrors, currentImportedContact } = req.body
    const project = { ...getSelectParamsFromBody(req) }
    const skip = Number(limit) * Number(page) - Number(limit)

    let errorQuery = false
    if (contactErrors === 'all') {
      errorQuery = false
    } else if (contactErrors === 'totalContactsWithError') {
      errorQuery = { contactErrors: { $ne: null } }
    } else if (contactErrors === 'contactsWithNoError') {
      errorQuery = { contactErrors: { $eq: null } }
    } else if (contactErrors) {
      errorQuery = { [`contactErrors.${contactErrors}`]: true }
    }

    const total = await findImportContactWithAggregationCount({
      match: {
        company: ObjectId(companyId),
        importedContact: ObjectId(currentImportedContact),
        ...(errorQuery && errorQuery)
      }
    })

    let errorsCount = await findImportContactWithAggregationErrorCount({
      match: {
        company: ObjectId(companyId),
        importedContact: ObjectId(currentImportedContact),
        contactErrors: { $ne: null }
      }
    })

    errorsCount = errorsCount?.[0]
    delete errorsCount?._id
    const totalErrors = await findImportContactWithAggregationCount({
      match: {
        company: ObjectId(companyId),
        importedContact: ObjectId(currentImportedContact),
        contactErrors: { $ne: null }
      }
    })

    const importContacts = await findImportContactsWithAggregation({
      limit: Number(limit),
      skip,
      match: {
        company: ObjectId(companyId),
        importedContact: ObjectId(currentImportedContact),
        ...(errorQuery && errorQuery)
        // contactErrors: { $ne: null }
      },
      project
    })
    console.log(errorsCount, 'errorsCount')
    return generalResponse(
      res,
      {
        data: importContacts,
        pagination: { total: total?.[0]?.count || 0, totalErrors: totalErrors?.[0]?.count || 0 },
        importErrors: {
          ...errorsCount,
          totalErrors: totalErrors?.[0]?.count || 0
        }
      },
      'success'
    )
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateCurrentImportContacts = async (req, res) => {
  try {
    const currentImportContact = ObjectId(req.params.id)
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const isCurrentImportContactExist = await findImportContact({
      _id: currentImportContact,
      company: ObjectId(currentUser.company)
    })
    if (!isCurrentImportContactExist) {
      return generalResponse(res, false, { text: 'Import contact Not Exists.' }, 'error', false, 400)
    }

    if (!req.body?.firstName) {
      return generalResponse(res, false, { text: 'Name is required.' }, 'error', false, 400)
    }

    if (isCurrentImportContactExist) {
      let contactErrors = {}

      if (req.body?.email) {
        // Check for emais is exist in contact list.
        const isContactExist = await findContact({ email: req.body?.email, company: ObjectId(currentUser.company) })
        if (isContactExist) {
          contactErrors.isContactAlreadyExists = true
        }

        // Check for emails is correct or not.
        if (!isValidateEmail(req.body?.email)) {
          contactErrors.isInvalidEmail = true
        }

        // Check for duplicate emails.
        const isDuplicateImportEmail = await findImportContact({
          'data.email': req.body?.email,
          company: ObjectId(currentUser.company),
          importedContact: Object(isCurrentImportContactExist.importedContact),
          _id: { $ne: ObjectId(currentImportContact) }
        })

        if (isDuplicateImportEmail) {
          contactErrors.isDuplicateEmail = true
        }
      }

      if (!Object.values(contactErrors).includes(true)) {
        contactErrors = null
      }

      await updateImportContact({ _id: ObjectId(currentImportContact) }, { contactErrors, data: req.body })

      const updatedImportContact = await findImportContact({
        _id: currentImportContact,
        company: ObjectId(currentUser.company)
      })
      return generalResponse(res, updatedImportContact, 'success')
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteCurrentImportContacts = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const deletedImportContact = await deleteImportContact({
      _id: ObjectId(req.params.id),
      company: ObjectId(currentUser.company)
    })

    if (deletedImportContact && deletedImportContact.acknowledged && deletedImportContact.matchedCount === 0) {
      return generalResponse(res, false, { text: 'Import contact Not Exists.' }, 'error', false, 400)
    }

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const importFinalContacts = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const currentImportContact = ObjectId(req.params.id)
    const isCurrentImportedContactJobExist = await findImportContactsJob({
      _id: currentImportContact,
      company: ObjectId(currentUser.company)
    })

    if (!isCurrentImportedContactJobExist) {
      return generalResponse(res, false, { text: 'Import contact Not Exists.' }, 'error', false, 400)
    }
    const { actionFields } = req.body
    const job = await createImportContactsSchedulerJob(
      {
        importContacts: currentImportContact,
        company: ObjectId(currentUser.company),
        actionFields: actionFields || {},
        currentUser
      },
      0
    )
    if (job.id) {
      await updateImportContactsJob(
        { _id: ObjectId(currentImportContact), company: ObjectId(currentUser.company) },
        { job: job.id }
      )
    }

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteImportContacts = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (!req.params.id) {
      return generalResponse(res, false, { text: 'Id is required.' }, 'error', false, 400)
    }
    console.log({
      importedContact: ObjectId(req.params.id),
      company: ObjectId(currentUser.company)
    })
    const deletedImportContact = await multipleDeleteImportContact({
      importedContact: ObjectId(req.params.id),
      company: ObjectId(currentUser.company)
    })
    console.log({ deletedImportContact })

    if (deletedImportContact && deletedImportContact.acknowledged && deletedImportContact.matchedCount === 0) {
      return generalResponse(res, false, { text: 'Import contact Not Exists.' }, 'error', false, 400)
    }

    const deletedImportedContactJob = await deleteImportContactsJob({
      _id: ObjectId(req.params.id),
      company: ObjectId(currentUser.company)
    })
    console.log({ deletedImportedContactJob })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const importContactCronJob = async () => {
  const allJobs = await findAllImportContactsJob({
    createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } /* before 1 Day */
  })

  await Promise.all(
    allJobs.map((job) => {
      return multipleDeleteImportContact({
        importedContact: ObjectId(job._id),
        company: ObjectId(job.company)
      })
    })
  )
}
