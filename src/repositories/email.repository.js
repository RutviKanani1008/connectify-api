import { ObjectId } from 'mongodb'
import { Email } from '../models/email'

export const getEmail = (params, projection = {}, populate = []) => {
  return Email.findOne(params, projection).populate(populate)
}

export const getEmailThreadRepo = ({ params, projection = {}, populate = [] }) => {
  return Email.find(params, projection).populate(populate).sort({ send_date: 1 })
}

export const getEmailThreadAggregateRepo = ({ params, projection = {}, populate = [] }) => {
  return Email.aggregate([
    { $match: params }, // Match documents based on your query parameters
    { $sort: { send_date: 1 } }, // Sort the documents by send_date
    { $group: { _id: '$message_id', email: { $first: '$$ROOT' } } }, // Group by message_id and keep the first document
    { $replaceRoot: { newRoot: '$email' } } // Replace the root with the grouped document
  ])
}

export const getEmailsRepo = async ({ params, skip, limit, project, folders }) => {
  const threadIds = await Email.distinct('mail_provider_thread_id', {
    ...params,
    folders // Filter to find threads with at least one email in the "inbox" folder
  }).lean()

  return Email.aggregate(
    [
      {
        $match: {
          ...params,
          mail_provider_thread_id: {
            $in: threadIds.length > 0 ? threadIds : ['$mail_provider_thread_id']
          }
        }
      },
      { $sort: { mail_provider_thread_id: 1, send_date: -1 } },
      {
        $group: {
          _id: '$mail_provider_thread_id',
          mail_provider_thread_id: { $first: '$mail_provider_thread_id' },
          from: { $first: '$from' },
          send_date: { $first: '$send_date' },
          flags: { $push: '$flags' },
          subject: { $last: '$subject' }
        }
      },
      {
        $sort: { send_date: -1 }
      },
      { $skip: skip },
      { $limit: limit }
    ],
    { allowDiskUse: true }
  )
}

export const getEmailByThreadIdRepo = async ({ mail_provider_thread_id, company, user, folders }) => {
  const threadIds = await Email.distinct('mail_provider_thread_id', {
    mail_provider_thread_id,
    company: ObjectId(company),
    user: ObjectId(user),
    folders // Filter to find threads with at least one email in the "inbox" folder
  }).lean()

  return Email.aggregate(
    [
      {
        $match: {
          mail_provider_thread_id: {
            $in: threadIds.length > 0 ? threadIds : ['$mail_provider_thread_id']
          }
        }
      },
      { $sort: { mail_provider_thread_id: 1, send_date: -1 } },
      {
        $group: {
          _id: '$mail_provider_thread_id',
          mail_provider_thread_id: { $first: '$mail_provider_thread_id' },
          from: { $first: '$from' },
          send_date: { $first: '$send_date' },
          flags: { $push: '$flags' },
          subject: { $last: '$subject' }
        }
      }
    ],
    { allowDiskUse: true }
  )
}

// *** Old Query ***
// export const getEmailsRepo = ({ params, skip, limit, project }) => {
//   return Email.aggregate(
//     [
//       {
//         $match: { ...params }
//       },
//       { $sort: { mail_provider_thread_id: 1, send_date: -1 } },
//       {
//         $group: {
//           _id: '$mail_provider_thread_id',
//           emails: { $first: '$$ROOT' }
//         }
//       },
//       {
//         $replaceRoot: { newRoot: '$emails' }
//       },
//       {
//         $project: {
//           ...project
//         }
//       },
//       {
//         $sort: { send_date: -1 }
//       },
//       { $skip: skip },
//       { $limit: limit }
//     ],
//     { allowDiskUse: true }
//   )
// }

export const getEmailsCountRepo = ({ params }) => {
  return Email.aggregate([
    {
      $match: { ...params }
    },
    {
      $group: {
        _id: null,
        threads: {
          $addToSet: '$mail_provider_thread_id'
        }
      }
    },
    {
      $project: {
        _id: 0,
        threadCount: { $size: '$threads' }
      }
    }
  ])
}

export const createEmail = (data) => {
  return Email.create(data)
}

export const deleteEmails = (params) => {
  return Email.deleteMany(params)
}

export const findAndUpdateEmail = (search, updateValue) => {
  return Email.updateOne(search, updateValue, { upsert: true })
}

export const updateEmail = (search, updateValue) => {
  return Email.updateOne(search, updateValue)
}

export const updateEmails = (search, updateValue) => {
  return Email.updateMany(search, updateValue)
}

export const getPrevEmailsRepo = ({ params, extraParams }) => {
  return Email.aggregate(
    [
      {
        $match: { ...params }
      },
      { $sort: { mail_provider_thread_id: 1, send_date: -1 } },
      {
        $group: {
          _id: '$mail_provider_thread_id',
          mail_provider_thread_id: { $first: '$mail_provider_thread_id' },
          send_date: { $first: '$send_date' }
        }
      },
      {
        $sort: { send_date: 1 }
      },
      {
        $match: {
          send_date: { $gt: new Date(extraParams.send_date) },
          mail_provider_thread_id: {
            $ne: extraParams.threadId
          }
        }
      },
      { $limit: 1 }
    ],
    { allowDiskUse: true }
  )
}

export const getNextEmailsRepo = ({ params, extraParams }) => {
  return Email.aggregate(
    [
      {
        $match: { ...params }
      },
      { $sort: { mail_provider_thread_id: 1, send_date: -1 } },
      {
        $group: {
          _id: '$mail_provider_thread_id',
          mail_provider_thread_id: { $first: '$mail_provider_thread_id' },
          send_date: { $first: '$send_date' }
        }
      },
      {
        $sort: { send_date: -1 }
      },
      {
        $match: {
          send_date: { $lt: new Date(extraParams.send_date) },
          mail_provider_thread_id: {
            $ne: extraParams.threadId
          }
        }
      },
      { $limit: 1 }
    ],
    { allowDiskUse: true }
  )
}
