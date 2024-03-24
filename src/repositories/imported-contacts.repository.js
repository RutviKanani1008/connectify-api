import { ImportContacts } from '../models/imported-contacts'

export const createBulkImportContacts = (orderObjArray) => {
  return ImportContacts.insertMany(orderObjArray)
}

export const findImportContactWithAggregationCount = ({ match }) => {
  return ImportContacts.aggregate([
    {
      $match: { ...match }
    },
    { $count: 'count' }
  ])
}

export const findImportContactWithAggregationErrorCount = ({ match }) => {
  return ImportContacts.aggregate([
    {
      $match: { ...match }
    },
    {
      $group: {
        _id: null,
        isDuplicateEmail: {
          $sum: {
            $cond: [{ $eq: ['$contactErrors.isDuplicateEmail', true] }, 1, 0]
          }
        },
        isInvalidEmail: {
          $sum: {
            $cond: [{ $eq: ['$contactErrors.isInvalidEmail', true] }, 1, 0]
          }
        },
        isEmailNotExists: {
          $sum: {
            $cond: [{ $eq: ['$contactErrors.isEmailNotExists', true] }, 1, 0]
          }
        },
        isNameNotExists: {
          $sum: {
            $cond: [{ $eq: ['$contactErrors.isNameNotExists', true] }, 1, 0]
          }
        },
        isContactAlreadyExists: {
          $sum: {
            $cond: [{ $eq: ['$contactErrors.isContactAlreadyExists', true] }, 1, 0]
          }
        }
      }
    }
  ])
}

export const findAllImportContacts = (params) => {
  return ImportContacts.find(params).sort({ createdAt: -1 })
}

export const findImportContact = (params) => {
  return ImportContacts.findOne(params)
}

export const updateImportContact = (search, updateValue) => {
  return ImportContacts.updateOne(search, updateValue)
}

export const findImportContactsWithAggregation = ({ match, skip, limit, project }) => {
  const $project = {
    ...(project && Object.keys(project).length
      ? { ...project }
      : {
          _id: 1
        })
  }
  return ImportContacts.aggregate([
    {
      $match: { ...match }
    },
    { $project },
    { $skip: skip },
    { $limit: limit }
  ])
}

export const deleteImportContact = (params) => {
  return ImportContacts.delete(params)
}

export const multipleDeleteImportContact = (params) => {
  return ImportContacts.deleteMany(params)
}
